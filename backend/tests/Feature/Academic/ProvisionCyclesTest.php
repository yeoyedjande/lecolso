<?php

declare(strict_types=1);

use App\Domains\Academic\Actions\ProvisionCycles;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Academic\Models\Level;
use App\Support\Cycles\Enums\AssessmentMode;
use App\Support\Cycles\Enums\AttendanceMode;
use App\Support\Cycles\Enums\BillingPeriod;
use App\Support\Cycles\Enums\TermType;
use App\Support\Tenancy\TenantContext;

it('ouvre garderie, maternelle et primaire avec leurs niveaux et paramètres (withCycles)', function (): void {
    $school = makeSchool(null);

    $cycles = inSchool($school, static fn () => Cycle::query()->with('levels')->orderBy('position')->get()->keyBy('code')->all());

    expect(array_keys($cycles))->toBe(['daycare', 'kindergarten', 'primary'])
        ->and(array_map(static fn (Cycle $cycle): string => $cycle->name, array_values($cycles)))->toBe(['Garderie', 'Maternelle', 'Primaire'])
        ->and(array_map(
            static fn (Cycle $cycle): array => $cycle->levels->pluck('code')->all(),
            $cycles,
        ))->toBe([
            'daycare' => ['CRECHE'],
            'kindergarten' => ['PS', 'MS', 'GS'],
            'primary' => ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'],
        ])
        ->and(inSchool($school, static fn (): int => Level::query()->count()))->toBe(10);

    $settings = array_map(static fn (Cycle $cycle): array => $cycle->settings->toArray(), $cycles);

    expect($settings['daycare'])->toMatchArray([
        'attendance_mode' => AttendanceMode::CheckInOut->value,
        'billing_period' => BillingPeriod::Monthly->value,
        'daily_log' => 'required',
    ])
        ->and($settings['kindergarten']['assessment_mode'])->toBe(AssessmentMode::Competency->value)
        ->and($settings['primary'])->toMatchArray([
            'assessment_mode' => AssessmentMode::WeightedAverage->value,
            'term_type' => TermType::Trimester->value,
        ]);
});

it('n’ouvre que les cycles demandés et reste idempotent', function (): void {
    $school = makeSchool(['daycare', 'kindergarten']);

    app(ProvisionCycles::class)->handle($school, ['kindergarten', 'primary']);

    expect(inSchool($school, static fn (): array => Cycle::query()->orderBy('position')->pluck('code')->all()))
        ->toBe(['daycare', 'kindergarten', 'primary'])
        ->and(inSchool($school, static fn (): int => Level::query()->count()))->toBe(10);
});

it('refuse un cycle absent du catalogue', function (): void {
    $school = makeSchool();

    expect(static fn () => app(ProvisionCycles::class)->handle($school, ['college']))
        ->toThrow(InvalidArgumentException::class, 'college');
});

it('rétablit le contexte précédent après avoir ouvert les cycles', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();

    inSchool($schoolA, function () use ($schoolB, $schoolA): void {
        app(ProvisionCycles::class)->handle($schoolB);

        expect(app(TenantContext::class)->schoolId())->toBe($schoolA->id)
            ->and(Cycle::query()->count())->toBe(0);
    });
});
