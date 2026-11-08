<?php

declare(strict_types=1);

use App\Domains\Identity\Enums\Role;
use App\Domains\Students\Models\Guardian;

it('ajoute un tuteur et peut lui confier le paiement', function (): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    actingAsRole(Role::Secretary, $school);

    spa('POST', '/api/v1/students/'.$student->id.'/guardians', [
        'name' => 'Ibrahim Koné', 'phone' => '05 01 02 03 04', 'relation' => 'father', 'is_payer' => true, 'can_pick_up' => false,
    ], $school)->assertOk()
        ->assertJsonCount(2, 'data.guardians')
        ->assertJsonPath('data.guardians.0.is_payer', false)
        ->assertJsonPath('data.guardians.0.is_primary_contact', true)
        ->assertJsonPath('data.guardians.1.name', 'Ibrahim Koné')
        ->assertJsonPath('data.guardians.1.is_payer', true)
        ->assertJsonPath('data.guardians.1.can_pick_up', false);

    spa('POST', '/api/v1/students/'.$student->id.'/guardians', ['name' => 'Ibrahim', 'phone' => '0501020304', 'relation' => 'father'], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('phone');
});

it('modifie un tuteur, partagé par la fratrie', function (): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    $sibling = enrollStudent($school, classroomOf($school, 'CP1'), ['first_name' => 'Yao']);
    enrollStudent($school, classroomOf($school, 'CM1'), ['first_name' => 'Voisin', 'guardian_phone' => '+2250102030405']);
    $guardian = inSchool($school, static fn (): Guardian => Guardian::query()->where('phone', '+2250701020304')->firstOrFail());
    actingAsRole(Role::Director, $school);
    $uri = '/api/v1/students/'.$student->id.'/guardians/'.$guardian->id;

    spa('PATCH', $uri, ['name' => 'Mariam Koné Diallo', 'profession' => 'Commerçante', 'relation' => 'guardian'], $school)->assertOk()
        ->assertJsonPath('data.guardians.0.name', 'Mariam Koné Diallo')
        ->assertJsonPath('data.guardians.0.relation', 'guardian');
    spa('GET', '/api/v1/students/'.$sibling->id, [], $school)
        ->assertJsonPath('data.guardians.0.name', 'Mariam Koné Diallo')
        ->assertJsonPath('data.guardians.0.relation', 'mother');

    spa('PATCH', $uri, ['phone' => '01 02 03 04 05'], $school)->assertUnprocessable()->assertJsonValidationErrors('phone');
    spa('PATCH', $uri, ['is_payer' => false], $school)->assertUnprocessable()->assertJsonValidationErrors('is_payer');
});

it('retire un tuteur sauf le dernier, le payeur ou le contact principal', function (): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    $mother = inSchool($school, static fn (): Guardian => Guardian::query()->firstOrFail());
    actingAsRole(Role::Director, $school);

    spa('DELETE', '/api/v1/students/'.$student->id.'/guardians/'.$mother->id, [], $school)
        ->assertStatus(409)->assertJsonPath('code', 'last_guardian');

    spa('POST', '/api/v1/students/'.$student->id.'/guardians', ['name' => 'Ibrahim Koné', 'phone' => '0501020304', 'relation' => 'father'], $school)->assertOk();
    spa('DELETE', '/api/v1/students/'.$student->id.'/guardians/'.$mother->id, [], $school)
        ->assertStatus(409)->assertJsonPath('code', 'reassign_first');

    $father = inSchool($school, static fn (): Guardian => Guardian::query()->where('phone', '+2250501020304')->firstOrFail());
    spa('DELETE', '/api/v1/students/'.$student->id.'/guardians/'.$father->id, [], $school)
        ->assertOk()->assertJsonCount(1, 'data.guardians');
    // Tuteur sans plus aucun élève : effacé
    expect(inSchool($school, static fn (): int => Guardian::query()->count()))->toBe(1);
});

it('répond 404 pour un tuteur d’un autre élève ou d’une autre école', function (): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    enrollStudent($school, classroomOf($school, 'CP1'), ['guardian_phone' => '+2250102030405']);
    $stranger = inSchool($school, static fn (): Guardian => Guardian::query()->where('phone', '+2250102030405')->firstOrFail());
    $other = makeSchool(['primary']);
    $foreign = enrollStudent($other, classroomOf($other, 'CE1'));
    actingAsRole(Role::Director, $school);

    spa('PATCH', '/api/v1/students/'.$student->id.'/guardians/'.$stranger->id, ['name' => 'X Y'], $school)->assertNotFound();
    spa('POST', '/api/v1/students/'.$foreign->id.'/guardians', ['name' => 'X Y', 'phone' => '0709090909', 'relation' => 'other'], $school)->assertNotFound();
});

it('réserve la gestion des tuteurs aux gestionnaires du cycle', function (): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    actingAsRole(Role::Accountant, $school);

    spa('POST', '/api/v1/students/'.$student->id.'/guardians', ['name' => 'X Y', 'phone' => '0709090909', 'relation' => 'other'], $school)->assertForbidden();
});
