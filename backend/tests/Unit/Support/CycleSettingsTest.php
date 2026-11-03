<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Cycle;
use App\Support\Cycles\CycleSettings;
use App\Support\Cycles\Enums\AssessmentMode;
use App\Support\Cycles\Enums\AttendanceMode;
use App\Support\Cycles\Enums\DailyLogMode;
use App\Support\Cycles\InvalidCycleSettings;
use Illuminate\Support\Facades\DB;

/**
 * @return array<string, string>
 */
function validSettings(): array
{
    return [
        'term_type' => 'free_period',
        'assessment_mode' => 'competency',
        'attendance_mode' => 'roll_call',
        'billing_period' => 'quarterly',
        'report_document' => 'skills_booklet',
        'daily_log' => 'optional',
    ];
}

it('construit des paramètres typés depuis un tableau et revient au même tableau', function (): void {
    $settings = CycleSettings::fromArray(validSettings());

    expect($settings->assessmentMode)->toBe(AssessmentMode::Competency)
        ->and($settings->attendanceMode)->toBe(AttendanceMode::RollCall)
        ->and($settings->dailyLog)->toBe(DailyLogMode::Optional)
        ->and($settings->toArray())->toBe(validSettings());
});

it('refuse une valeur inconnue, un paramètre manquant ou un paramètre inconnu', function (array $settings, string $message): void {
    expect(static fn () => CycleSettings::fromArray($settings))->toThrow(InvalidCycleSettings::class, $message);
})->with([
    'valeur inconnue' => [['assessment_mode' => 'lmd_credits'] + validSettings(), 'assessment_mode'],
    'paramètre manquant' => [array_diff_key(validSettings(), ['billing_period' => true]), 'billing_period'],
    'paramètre inconnu' => [validSettings() + ['canteen' => 'yes'], 'canteen'],
    'type invalide' => [['daily_log' => true] + validSettings(), 'daily_log'],
]);

it('valide et convertit cycles.settings depuis et vers le JSONB', function (): void {
    $school = makeSchool();

    $cycle = inSchool($school, static fn (): Cycle => Cycle::factory()->createOne(['settings' => validSettings()]));

    $stored = inSchool($school, static fn (): mixed => DB::scalar('select settings from cycles where id = ?', [$cycle->id]));
    expect(is_string($stored) ? json_decode($stored, true) : null)->toEqual(validSettings());

    $reloaded = inSchool($school, static fn (): Cycle => Cycle::query()->findOrFail($cycle->id));
    expect($reloaded->settings)->toBeInstanceOf(CycleSettings::class)
        ->and($reloaded->settings->assessmentMode)->toBe(AssessmentMode::Competency);

    expect(static fn () => inSchool($school, static fn (): Cycle => Cycle::factory()->createOne([
        'settings' => ['assessment_mode' => 'n_importe_quoi'] + validSettings(),
    ])))->toThrow(InvalidCycleSettings::class);
});
