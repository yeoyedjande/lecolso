<?php

declare(strict_types=1);

use App\Domains\Identity\Enums\Role;

use function Pest\Laravel\getJson;

it('publie les tarifs de l’année en cours seulement si l’école l’a choisi', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    setFees($school, 'CE1', ['registration' => 25000, 'tuition' => 180000, 'canteen' => 60000]);
    setFees($school, 'PS', ['registration' => 20000, 'tuition' => 150000]);
    $uri = '/api/v1/public/schools/'.$school->slug.'/fees';

    getJson($uri)->assertOk()->assertExactJson(['data' => null]);

    // Réglage réservé à school.settings.manage (direction), visible dans l'identité de l'école
    actingAsRole(Role::Secretary, $school);
    spa('PATCH', '/api/v1/school', ['public_fees' => true], $school)->assertForbidden();
    actingAsRole(Role::Director, $school);
    spa('PATCH', '/api/v1/school', ['public_fees' => true], $school)->assertOk()->assertJsonPath('data.public_fees', true);
    spa('GET', '/api/v1/school', [], $school)->assertOk()->assertJsonPath('data.public_fees', true);

    $fees = getJson($uri)->assertOk()
        ->assertJsonPath('data.year_label', currentYearOf($school)->label)
        ->assertJsonPath('data.fee_types.0.code', 'registration')
        ->assertJsonPath('data.fee_types.2.code', 'canteen')
        ->assertJsonPath('data.fee_types.2.optional', true)
        ->assertJsonPath('data.levels.0.level_name', 'Petite section')
        ->assertJsonPath('data.levels.0.amounts.tuition', 150000);
    $ce1 = $fees->collect('data.levels')->firstWhere('level_code', 'CE1');
    expect($ce1)->toBe(['cycle_name' => 'Primaire', 'level_code' => 'CE1', 'level_name' => 'CE1', 'amounts' => ['registration' => 25000, 'tuition' => 180000, 'canteen' => 60000]]);

    spa('PATCH', '/api/v1/school', ['public_fees' => false], $school)->assertOk()->assertJsonPath('data.public_fees', false);
    getJson($uri)->assertOk()->assertExactJson(['data' => null]);
    getJson('/api/v1/public/schools/inconnue/fees')->assertNotFound();
});

it('ne publie que les tarifs de l’école de la page', function (): void {
    $school = makeSchool(['primary']);
    $other = makeSchool(['primary']);
    setFees($other, 'CE1', ['tuition' => 999000]);
    actingAsRole(Role::Director, $school);
    spa('PATCH', '/api/v1/school', ['public_fees' => true], $school)->assertOk();
    setFees($school, 'CE1', ['tuition' => 180000]);

    $levels = getJson('/api/v1/public/schools/'.$school->slug.'/fees')->assertOk()->collect('data.levels');
    expect($levels->pluck('amounts.tuition')->filter()->values()->all())->toBe([180000]);
});
