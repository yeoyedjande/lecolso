<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Enums\Role;

it('liste tous les cycles pour un directeur de toute l’école', function (): void {
    $school = makeSchool(null);
    actingAsRole(Role::Director, $school);

    spa('GET', '/api/v1/cycles', [], $school)
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.1.code', 'kindergarten')
        ->assertJsonPath('data.1.settings.assessment_mode', 'competency')
        ->assertJsonPath('data.1.levels.0.code', 'PS');
});

it('ne liste que son cycle pour un directeur limité à la maternelle', function (): void {
    $school = makeSchool(null);
    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));

    spa('GET', '/api/v1/cycles', [], $school)
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.code', 'kindergarten');
});

it('permet au directeur de modifier le nom et les paramètres d’un cycle', function (): void {
    $school = makeSchool(null);
    $kindergarten = cycleOf($school, 'kindergarten');
    actingAsRole(Role::Director, $school);

    spa('PATCH', "/api/v1/cycles/{$kindergarten->id}", [
        'name' => 'Maternelle bilingue',
        'settings' => ['billing_period' => 'monthly'],
    ], $school)
        ->assertOk()
        ->assertJsonPath('data.name', 'Maternelle bilingue')
        ->assertJsonPath('data.settings.billing_period', 'monthly')
        // Les autres paramètres sont conservés
        ->assertJsonPath('data.settings.assessment_mode', 'competency');
});

it('refuse à un directeur de la maternelle de modifier le primaire', function (): void {
    $school = makeSchool(null);
    $kindergarten = cycleOf($school, 'kindergarten');
    $primary = cycleOf($school, 'primary');
    actingAsRole(Role::Director, $school, $kindergarten);

    spa('PATCH', "/api/v1/cycles/{$primary->id}", ['name' => 'Primaire modifié'], $school)->assertForbidden();
    spa('PATCH', "/api/v1/cycles/{$kindergarten->id}", ['name' => 'Maternelle modifiée'], $school)->assertOk();

    expect(inSchool($school, static fn (): string => Cycle::query()->findOrFail($primary->id)->name))->toBe('Primaire');
});

it('refuse la modification aux rôles sans le droit sur les paramètres', function (Role $role): void {
    $school = makeSchool(['primary']);
    actingAsRole($role, $school);

    spa('PATCH', '/api/v1/cycles/'.cycleOf($school, 'primary')->id, ['name' => 'X y'], $school)->assertForbidden();
})->with([Role::Secretary, Role::Accountant, Role::Teacher, Role::Guardian]);

it('valide les paramètres du cycle', function (array $payload, string $field): void {
    $school = makeSchool(['primary']);
    actingAsRole(Role::Director, $school);

    spa('PATCH', '/api/v1/cycles/'.cycleOf($school, 'primary')->id, $payload, $school)
        ->assertUnprocessable()
        ->assertJsonValidationErrors([$field]);
})->with([
    'valeur inconnue' => [['settings' => ['assessment_mode' => 'lmd_credits']], 'settings'],
    'paramètre inconnu' => [['settings' => ['canteen' => 'yes']], 'settings'],
    'nom trop court' => [['name' => 'x'], 'name'],
]);

it('isole les cycles entre écoles (404)', function (): void {
    $schoolA = makeSchool(['primary']);
    $schoolB = makeSchool(['primary']);
    $cycleB = cycleOf($schoolB, 'primary');
    actingAsRole(Role::Director, $schoolA);

    // Cycle de B depuis l'école A : introuvable
    spa('PATCH', "/api/v1/cycles/{$cycleB->id}", ['name' => 'Piraté'], $schoolA)->assertNotFound();
    // En se réclamant de B, sans y être membre
    spa('GET', '/api/v1/cycles', [], $schoolB)->assertNotFound();
    spa('PATCH', "/api/v1/cycles/{$cycleB->id}", ['name' => 'Piraté'], $schoolB)->assertNotFound();

    expect(inSchool($schoolB, static fn (): string => Cycle::query()->findOrFail($cycleB->id)->name))->toBe('Primaire');
});

it('exige une session et l’en-tête de l’école', function (): void {
    $school = makeSchool(['primary']);

    spa('GET', '/api/v1/cycles', [], $school)->assertUnauthorized();

    actingAsRole(Role::Director, $school);
    spa('GET', '/api/v1/cycles')->assertBadRequest();
});
