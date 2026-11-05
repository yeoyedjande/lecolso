<?php

declare(strict_types=1);

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Billing\Models\FeeSchedule;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Identity\Enums\Role;

it('donne la grille de l’année avec les types de frais et le calendrier proposé de chaque cycle', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    currentYearOf($school);
    setFees($school, 'CE1', ['registration' => 25000, 'tuition' => 180000]);
    actingAsRole(Role::Accountant, $school);

    $response = spa('GET', '/api/v1/billing/grid', [], $school)->assertOk()
        ->assertJsonPath('data.academic_year.label', '2026-2027')
        ->assertJsonPath('data.fee_types.0.code', 'registration')
        ->assertJsonPath('data.fee_types.0.billing', 'once')
        ->assertJsonPath('data.fee_types.2.is_optional', true)
        ->assertJsonPath('data.cycles.1.code', 'primary')
        ->assertJsonPath('data.cycles.1.billing_period', 'quarterly')
        ->assertJsonPath('data.cycles.1.can_manage', true)
        ->assertJsonPath('data.cycles.1.dates.1.due_on', '2027-01-05')
        ->assertJsonPath('data.cycles.1.dates.1.label', '2e trimestre');

    $ce1 = collect((array) $response->json('data.cycles.1.levels'))->firstWhere('code', 'CE1');
    expect(is_array($ce1) ? $ce1['amounts'] : null)->toHaveCount(2);
});

it('enregistre la grille, un montant à 0 retirant le frais', function (): void {
    $school = makeSchool(['primary']);
    currentYearOf($school);
    setFees($school, 'CP1', ['canteen' => 60000]);
    $level = levelOf($school, 'CP1');
    actingAsRole(Role::Director, $school);

    spa('PUT', '/api/v1/billing/grid', ['amounts' => [
        ['level_id' => $level->id, 'fee_type_id' => feeTypeOf($school, 'tuition')->id, 'amount' => 150000],
        ['level_id' => $level->id, 'fee_type_id' => feeTypeOf($school, 'canteen')->id, 'amount' => 0],
    ]], $school)->assertOk();

    expect(inSchool($school, static fn (): array => FeeSchedule::query()->pluck('amount')->all()))->toBe([150000]);
});

it('valide la grille', function (array $entry, string $field): void {
    $school = makeSchool(['primary']);
    currentYearOf($school);
    actingAsRole(Role::Director, $school);
    $entry = [...['level_id' => levelOf($school, 'CP1')->id, 'fee_type_id' => feeTypeOf($school, 'tuition')->id, 'amount' => 1000], ...$entry];

    spa('PUT', '/api/v1/billing/grid', ['amounts' => [$entry]], $school)->assertUnprocessable()->assertJsonValidationErrors($field);
})->with([
    'montant négatif' => [['amount' => -5], 'amounts.0.amount'],
    'montant décimal' => [['amount' => 1500.5], 'amounts.0.amount'],
    'type inconnu' => [['fee_type_id' => '0195f000-0000-7000-8000-00000000dead'], 'amounts.0.fee_type_id'],
]);

it('limite la grille aux cycles gérés et la refuse sur une année clôturée', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    $year = currentYearOf($school);
    $entry = ['level_id' => levelOf($school, 'CE1')->id, 'fee_type_id' => feeTypeOf($school, 'tuition')->id, 'amount' => 1000];

    actingAsRole(Role::Secretary, $school);
    spa('PUT', '/api/v1/billing/grid', ['amounts' => [$entry]], $school)->assertForbidden();

    $maternelle = customRole($school, ['billing.view', 'billing.manage'], 'Économe maternelle');
    $user = makeUser();
    assignRole($user, $school, $maternelle->id, cycleOf($school, 'kindergarten'));
    login($user)->assertOk();
    spa('PUT', '/api/v1/billing/grid', ['amounts' => [$entry]], $school)->assertForbidden();
    spa('GET', '/api/v1/billing/grid', [], $school)->assertOk()->assertJsonCount(1, 'data.cycles');

    actingAsRole(Role::Director, $school);
    inSchool($school, static fn () => $year->forceFill(['status' => AcademicYearStatus::Closed, 'is_current' => false])->save());
    spa('PUT', '/api/v1/billing/grid', ['academic_year_id' => $year->id, 'amounts' => [$entry]], $school)
        ->assertStatus(409)->assertJsonPath('code', 'year_closed');
});

it('isole la grille entre deux écoles', function (): void {
    $school = makeSchool(['primary']);
    $other = makeSchool(['primary']);
    currentYearOf($school);
    currentYearOf($other);
    actingAsRole(Role::Director, $school);

    spa('PUT', '/api/v1/billing/grid', ['amounts' => [[
        'level_id' => levelOf($other, 'CP1')->id, 'fee_type_id' => feeTypeOf($school, 'tuition')->id, 'amount' => 1000,
    ]]], $school)->assertUnprocessable()->assertJsonValidationErrors('amounts.0.level_id');
    expect(inSchool($other, static fn (): int => FeeSchedule::query()->count()))->toBe(0);
});

it('modifie les dates des échéances d’un cycle', function (): void {
    $school = makeSchool(['primary']);
    currentYearOf($school);
    $cycle = cycleOf($school, 'primary');
    actingAsRole(Role::Director, $school);
    $dates = [
        ['due_on' => '2026-09-14', 'label' => 'Rentrée'],
        ['due_on' => '2027-01-10', 'label' => 'Janvier'],
        ['due_on' => '2027-04-12', 'label' => 'Avril'],
    ];

    spa('PUT', '/api/v1/billing/calendars/'.$cycle->id, ['dates' => $dates], $school)->assertOk()
        ->assertJsonPath('data.cycles.0.dates.1.due_on', '2027-01-10')
        ->assertJsonPath('data.cycles.0.dates.2.label', 'Avril');

    spa('PUT', '/api/v1/billing/calendars/'.$cycle->id, ['dates' => array_slice($dates, 0, 2)], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('dates');
    spa('PUT', '/api/v1/billing/calendars/'.$cycle->id, ['dates' => [$dates[0], ['due_on' => '2026-09-01', 'label' => 'Avant'], $dates[2]]], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('dates.1.due_on');
    spa('PUT', '/api/v1/billing/calendars/'.$cycle->id, ['dates' => [$dates[0], $dates[1], ['due_on' => '2027-08-01', 'label' => 'Été']]], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('dates.2.due_on');
});

it('facture les élèves déjà inscrits, une seule fois, dans les cycles gérés', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    setFees($school, 'CE1', ['tuition' => 90000]);
    setFees($school, 'CE2', ['tuition' => 90000]);
    setFees($school, 'PS', ['tuition' => 90000]);
    enrollStudent($school, classroomOf($school, 'CE1'));
    enrollStudent($school, classroomOf($school, 'CE2'), ['guardian_phone' => '+2250102030405']);
    enrollStudent($school, classroomOf($school, 'PS'), ['guardian_phone' => '+2250102030406']);

    $role = customRole($school, ['billing.view', 'billing.manage'], 'Économe primaire');
    $user = makeUser();
    assignRole($user, $school, $role->id, cycleOf($school, 'primary'));
    login($user)->assertOk();

    spa('GET', '/api/v1/billing/grid', [], $school)->assertJsonPath('data.pending_invoices', 2);
    spa('POST', '/api/v1/billing/invoices/generate', [], $school)->assertOk()->assertJsonPath('created', 2);
    spa('POST', '/api/v1/billing/invoices/generate', [], $school)->assertOk()->assertJsonPath('created', 0);

    expect(inSchool($school, static fn (): int => Invoice::query()->count()))->toBe(2);
    spa('GET', '/api/v1/billing/schedules', [], $school)->assertOk()
        ->assertJsonPath('data.0.due_on', '2026-09-14')
        ->assertJsonPath('data.0.expected', 60000)
        ->assertJsonPath('data.0.invoices', 2);
});

it('réserve la grille et l’échéancier au personnel : ni enseignant ni parent', function (Role $role): void {
    $school = makeSchool(['primary']);
    setFees($school, 'CE1', ['tuition' => 90000]);
    enrollStudent($school, classroomOf($school, 'CE1'));
    actingAsRole($role, $school);

    // Le parent a billing.view (factures de ses enfants), jamais les montants des autres familles
    spa('GET', '/api/v1/billing/grid', [], $school)->assertForbidden();
    spa('GET', '/api/v1/billing/schedules', [], $school)->assertForbidden();
    spa('POST', '/api/v1/billing/invoices/generate', [], $school)->assertForbidden();
})->with([Role::Teacher, Role::Guardian]);
