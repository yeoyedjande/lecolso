<?php

declare(strict_types=1);

use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;

it('liste les élèves de l’année en cours par nom, sans données médicales', function (): void {
    $school = makeSchool(['primary']);
    $ce1 = classroomOf($school, 'CE1');
    enrollStudent($school, $ce1, ['first_name' => 'Yao', 'last_name' => 'Traoré', 'allergies' => 'Arachide']);
    enrollStudent($school, classroomOf($school, 'CP1'), ['first_name' => 'Awa', 'last_name' => 'Bamba', 'guardian_phone' => '+2250102030405']);
    actingAsRole(Role::Director, $school);

    $response = spa('GET', '/api/v1/students', [], $school)->assertOk()->assertJsonCount(2, 'data');

    expect(array_column((array) $response->json('data'), 'full_name'))->toBe(['BAMBA Awa', 'TRAORÉ Yao']);
    $response->assertJsonPath('data.1.enrollment.classroom_name', 'CE1 A')
        ->assertJsonPath('data.1.enrollment.cycle_code', 'primary')
        ->assertJsonPath('data.1.primary_contact.phone', '+2250701020304')
        ->assertJsonPath('meta.per_page', 25);
    $content = (string) $response->getContent();
    expect(str_contains($content, 'Arachide'))->toBeFalse()->and(str_contains($content, 'allergies'))->toBeFalse();
});

it('cherche par nom, matricule ou téléphone d’un tuteur, et filtre par classe', function (): void {
    $school = makeSchool(['primary'], ['code' => 'LAU']);
    $ce1 = classroomOf($school, 'CE1');
    enrollStudent($school, $ce1, ['first_name' => 'Yao', 'last_name' => 'Traoré']);
    enrollStudent($school, classroomOf($school, 'CP1'), ['first_name' => 'Awa', 'last_name' => 'Bamba', 'guardian_phone' => '+2250102030405', 'guardian_name' => 'Fatou Bamba']);
    actingAsRole(Role::Director, $school);

    $names = static fn (array $query): array => array_column((array) spa('GET', '/api/v1/students?'.http_build_query($query), [], $school)->assertOk()->json('data'), 'full_name');

    expect($names(['search' => 'yao tra']))->toBe(['TRAORÉ Yao'])
        ->and($names(['search' => 'lau-000002']))->toBe(['BAMBA Awa'])
        ->and($names(['search' => '01 02 03 04 05']))->toBe(['BAMBA Awa'])
        ->and($names(['search' => 'Mariam']))->toBe(['TRAORÉ Yao'])
        ->and($names(['classroom_id' => $ce1->id]))->toBe(['TRAORÉ Yao']);
});

it('limite la liste au cycle de l’utilisateur', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    enrollStudent($school, classroomOf($school, 'PS'), ['first_name' => 'Petit']);
    enrollStudent($school, classroomOf($school, 'CE1'), ['first_name' => 'Grand', 'guardian_phone' => '+2250102030405']);
    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));

    $response = spa('GET', '/api/v1/students', [], $school)->assertOk()->assertJsonCount(1, 'data');
    expect($response->json('data.0.first_name'))->toBe('Petit');
});

it('montre à l’enseignant les seuls élèves de ses classes', function (): void {
    $school = makeSchool(['primary']);
    $teacher = makeUser();
    assignRole($teacher, $school, Role::Teacher);
    $mine = enrollStudent($school, classroomOf($school, 'CE1', 'A', ['homeroom_teacher_id' => $teacher->id]), ['first_name' => 'Mien', 'allergies' => 'Lait']);
    $other = enrollStudent($school, classroomOf($school, 'CE2'), ['first_name' => 'Autre', 'guardian_phone' => '+2250102030405']);
    login($teacher)->assertOk();

    spa('GET', '/api/v1/students', [], $school)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $mine->id);
    spa('GET', '/api/v1/students/'.$mine->id, [], $school)->assertOk()
        ->assertJsonPath('data.medical.allergies', 'Lait')
        ->assertJsonPath('data.can_manage', false);
    spa('GET', '/api/v1/students/'.$other->id, [], $school)->assertNotFound();
});

it('montre au parent ses seuls enfants, rapprochés par son téléphone', function (): void {
    $school = makeSchool(['primary']);
    $parent = User::factory()->createOne(['phone' => '+2250701020304']);
    assignRole($parent, $school, Role::Guardian);
    $child = enrollStudent($school, classroomOf($school, 'CE1'), ['first_name' => 'Enfant']);
    $other = enrollStudent($school, classroomOf($school, 'CE2'), ['first_name' => 'Voisin', 'guardian_phone' => '+2250102030405']);
    login($parent)->assertOk();

    spa('GET', '/api/v1/students', [], $school)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $child->id);
    spa('GET', '/api/v1/students/'.$other->id, [], $school)->assertNotFound();
});

it('ne donne les données médicales qu’aux rôles qui en ont besoin', function (Role $role, bool $visible): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'), ['allergies' => 'Arachide']);
    actingAsRole($role, $school);

    $response = spa('GET', '/api/v1/students/'.$student->id, [], $school)->assertOk()->assertJsonPath('data.can_view_medical', $visible);

    expect(str_contains((string) $response->getContent(), 'Arachide'))->toBe($visible);
})->with([
    'direction' => [Role::Director, true],
    'secrétariat' => [Role::Secretary, true],
    'comptabilité' => [Role::Accountant, false],
    'promoteur' => [Role::Promoter, false],
]);

it('donne le dossier complet avec l’historique des inscriptions', function (): void {
    $school = makeSchool(['primary'], ['code' => 'LAU']);
    $student = enrollStudent($school, classroomOf($school, 'CE1', 'A', ['room' => 'Salle 3']));
    actingAsRole(Role::Director, $school);

    spa('GET', '/api/v1/students/'.$student->id, [], $school)->assertOk()
        ->assertJsonPath('data.matricule', 'LAU-000001')
        ->assertJsonPath('data.birth_date', '2019-03-14')
        ->assertJsonPath('data.enrollments.0.academic_year.is_current', true)
        ->assertJsonPath('data.enrollments.0.enrolled_on', '2026-09-07')
        ->assertJsonPath('data.guardians.0.relation', 'mother')
        ->assertJsonPath('data.siblings', []);
});

it('isole les élèves entre deux écoles', function (): void {
    $school = makeSchool(['primary']);
    $other = makeSchool(['primary']);
    $foreign = enrollStudent($other, classroomOf($other, 'CE1'));
    actingAsRole(Role::Director, $school);

    spa('GET', '/api/v1/students', [], $school)->assertOk()->assertJsonCount(0, 'data');
    spa('GET', '/api/v1/students/'.$foreign->id, [], $school)->assertNotFound();
    spa('PATCH', '/api/v1/students/'.$foreign->id, ['first_name' => 'Pirate'], $school)->assertNotFound();
    spa('DELETE', '/api/v1/students/'.$foreign->id, [], $school)->assertNotFound();
    expect(inSchool($other, static fn (): ?string => Student::query()->first()?->first_name))->toBe('Awa');
});

it('modifie le dossier, données médicales comprises', function (): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    actingAsRole(Role::Secretary, $school);

    spa('PATCH', '/api/v1/students/'.$student->id, [
        'first_name' => ' Aïcha ',
        'birth_place' => 'Bouaké',
        'address' => '',
        'blood_type' => 'A+',
        'allergies' => 'Pénicilline',
    ], $school)->assertOk()
        ->assertJsonPath('data.first_name', 'Aïcha')
        ->assertJsonPath('data.birth_place', 'Bouaké')
        ->assertJsonPath('data.address', null)
        ->assertJsonPath('data.medical.blood_type', 'A+')
        ->assertJsonPath('data.medical.allergies', 'Pénicilline');

    spa('PATCH', '/api/v1/students/'.$student->id, ['blood_type' => 'Z'], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('blood_type');
});

it('limite la modification aux gestionnaires du cycle de l’élève', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    $role = customRole($school, ['students.view', 'students.manage']);

    actingAsRole(Role::Accountant, $school);
    spa('PATCH', '/api/v1/students/'.$student->id, ['first_name' => 'X'], $school)->assertForbidden();

    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));
    spa('PATCH', '/api/v1/students/'.$student->id, ['first_name' => 'X'], $school)->assertNotFound();

    actingAsRole($role->id, $school);
    spa('PATCH', '/api/v1/students/'.$student->id, ['allergies' => 'Lait'], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('allergies');
    spa('PATCH', '/api/v1/students/'.$student->id, ['last_name' => 'Diallo'], $school)
        ->assertOk()->assertJsonPath('data.medical', null);
});

it('supprime un dossier sans jamais réutiliser son matricule', function (): void {
    $school = makeSchool(['primary'], ['code' => 'LAU']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    actingAsRole(Role::Director, $school);

    spa('DELETE', '/api/v1/students/'.$student->id, [], $school)->assertNoContent();
    spa('GET', '/api/v1/students/'.$student->id, [], $school)->assertNotFound();
    spa('GET', '/api/v1/students', [], $school)->assertJsonCount(0, 'data');

    expect(enrollStudent($school, classroomOf($school, 'CE2'))->matricule)->toBe('LAU-000002');
});
