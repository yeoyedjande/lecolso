<?php

declare(strict_types=1);

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Identity\Enums\Role;
use App\Domains\Tenancy\Models\School;

/**
 * Année scolaire d'une école (2026-2027 en cours par défaut).
 *
 * @param  array<string, mixed>  $attributes
 */
function academicYear(School $school, array $attributes = []): AcademicYear
{
    return inSchool($school, static fn (): AcademicYear => AcademicYear::factory()->createOne($attributes));
}

it('liste les années scolaires à tout membre, la plus récente d’abord', function (): void {
    $school = makeSchool();
    academicYear($school, ['label' => '2025-2026', 'starts_on' => '2025-09-15', 'ends_on' => '2026-07-03', 'is_current' => false, 'status' => 'closed']);
    academicYear($school);
    actingAsRole(Role::Teacher, $school);

    spa('GET', '/api/v1/academic-years', [], $school)
        ->assertOk()
        ->assertJsonPath('data.0.label', '2026-2027')
        ->assertJsonPath('data.0.is_current', true)
        ->assertJsonPath('data.1.status', 'closed');
});

it('crée l’année suivante et en fait l’année en cours (une seule à la fois)', function (): void {
    $school = makeSchool();
    $current = academicYear($school);
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/academic-years', [
        'label' => '2027-2028',
        'starts_on' => '2027-09-13',
        'ends_on' => '2028-07-01',
        'is_current' => true,
    ], $school)->assertCreated()->assertJsonPath('data.is_current', true)->assertJsonPath('data.status', 'open');

    expect(inSchool($school, static fn (): bool => AcademicYear::query()->findOrFail($current->id)->is_current))->toBeFalse();

    // L'ancienne année peut maintenant être clôturée
    spa('PATCH', "/api/v1/academic-years/{$current->id}", ['status' => 'closed'], $school)->assertOk()->assertJsonPath('data.status', 'closed');
});

it('ne clôture pas l’année en cours', function (): void {
    $school = makeSchool();
    $current = academicYear($school);
    actingAsRole(Role::Director, $school);

    spa('PATCH', "/api/v1/academic-years/{$current->id}", ['status' => 'closed'], $school)
        ->assertConflict()
        ->assertJsonPath('code', 'current_year');
});

it('valide l’année scolaire', function (array $payload, string $field): void {
    $school = makeSchool();
    academicYear($school);
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/academic-years', $payload, $school)->assertUnprocessable()->assertJsonValidationErrors([$field]);
})->with([
    'libellé mal formé' => [['label' => '2027', 'starts_on' => '2027-09-13', 'ends_on' => '2028-07-01'], 'label'],
    'années qui ne se suivent pas' => [['label' => '2027-2029', 'starts_on' => '2027-09-13', 'ends_on' => '2028-07-01'], 'label'],
    'déjà existante' => [['label' => '2026-2027', 'starts_on' => '2026-09-14', 'ends_on' => '2027-07-02'], 'label'],
    'fin avant début' => [['label' => '2027-2028', 'starts_on' => '2027-09-13', 'ends_on' => '2027-07-01'], 'ends_on'],
]);

it('réserve la gestion des années à la direction de toute l’école', function (): void {
    $school = makeSchool(['kindergarten']);
    $year = academicYear($school);

    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));
    spa('POST', '/api/v1/academic-years', ['label' => '2027-2028', 'starts_on' => '2027-09-13', 'ends_on' => '2028-07-01'], $school)->assertForbidden();

    actingAsRole(Role::Secretary, $school);
    spa('PATCH', "/api/v1/academic-years/{$year->id}", ['ends_on' => '2027-07-09'], $school)->assertForbidden();
});

it('isole les années scolaires entre écoles', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();
    $yearA = academicYear($schoolA);
    actingAsRole(Role::Director, $schoolB);

    spa('GET', '/api/v1/academic-years', [], $schoolB)->assertOk()->assertJsonCount(0, 'data');
    spa('PATCH', "/api/v1/academic-years/{$yearA->id}", ['ends_on' => '2027-07-09'], $schoolB)->assertNotFound();
});
