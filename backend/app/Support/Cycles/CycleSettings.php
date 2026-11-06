<?php

declare(strict_types=1);

namespace App\Support\Cycles;

use App\Support\Cycles\Enums\AssessmentMode;
use App\Support\Cycles\Enums\AttendanceMode;
use App\Support\Cycles\Enums\BillingPeriod;
use App\Support\Cycles\Enums\DailyLogMode;
use App\Support\Cycles\Enums\GradeScale;
use App\Support\Cycles\Enums\ReportDocument;
use App\Support\Cycles\Enums\TermType;
use BackedEnum;
use Illuminate\Contracts\Database\Eloquent\Castable;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use JsonException;

/**
 * Paramètres d'un cycle (cycles.settings, JSONB). Le comportement des écrans et des calculs
 * en dépend, jamais le nom du cycle (ADR 0003). Toute valeur inconnue ou manquante est refusée.
 */
final readonly class CycleSettings implements Castable
{
    /** @var list<string> */
    public const array KEYS = [
        'term_type',
        'assessment_mode',
        'attendance_mode',
        'billing_period',
        'report_document',
        'daily_log',
        'grade_scale',
    ];

    public function __construct(
        public TermType $termType,
        public AssessmentMode $assessmentMode,
        public AttendanceMode $attendanceMode,
        public BillingPeriod $billingPeriod,
        public ReportDocument $reportDocument,
        public DailyLogMode $dailyLog,
        public GradeScale $gradeScale = GradeScale::Ten,
    ) {}

    /**
     * @param  array<mixed>  $settings
     *
     * @throws InvalidCycleSettings
     */
    public static function fromArray(array $settings): self
    {
        $unknown = array_diff(array_map(strval(...), array_keys($settings)), self::KEYS);
        if ($unknown !== []) {
            throw new InvalidCycleSettings('Paramètres de cycle inconnus : '.implode(', ', $unknown));
        }

        return new self(
            termType: self::enum($settings, 'term_type', TermType::class),
            assessmentMode: self::enum($settings, 'assessment_mode', AssessmentMode::class),
            attendanceMode: self::enum($settings, 'attendance_mode', AttendanceMode::class),
            billingPeriod: self::enum($settings, 'billing_period', BillingPeriod::class),
            reportDocument: self::enum($settings, 'report_document', ReportDocument::class),
            dailyLog: self::enum($settings, 'daily_log', DailyLogMode::class),
            // Ajouté au lot 7 : facultatif, sur 10 par défaut (cycles existants)
            gradeScale: array_key_exists('grade_scale', $settings) ? self::enum($settings, 'grade_scale', GradeScale::class) : GradeScale::Ten,
        );
    }

    /**
     * @return array{term_type: string, assessment_mode: string, attendance_mode: string, billing_period: string, report_document: string, daily_log: string, grade_scale: string}
     */
    public function toArray(): array
    {
        return [
            'term_type' => $this->termType->value,
            'assessment_mode' => $this->assessmentMode->value,
            'attendance_mode' => $this->attendanceMode->value,
            'billing_period' => $this->billingPeriod->value,
            'report_document' => $this->reportDocument->value,
            'daily_log' => $this->dailyLog->value,
            'grade_scale' => $this->gradeScale->value,
        ];
    }

    /**
     * Conversion Eloquent depuis et vers le JSONB.
     *
     * @param  array<mixed>  $arguments
     * @return CastsAttributes<self, self|array<mixed>>
     */
    public static function castUsing(array $arguments): CastsAttributes
    {
        return new class implements CastsAttributes
        {
            public function get(Model $model, string $key, mixed $value, array $attributes): ?CycleSettings
            {
                if ($value === null) {
                    return null;
                }

                if (! is_string($value)) {
                    throw new InvalidCycleSettings('Paramètres de cycle illisibles.');
                }

                try {
                    $decoded = json_decode($value, true, 512, JSON_THROW_ON_ERROR);
                } catch (JsonException $exception) {
                    throw new InvalidCycleSettings('Paramètres de cycle illisibles.', previous: $exception);
                }

                if (! is_array($decoded)) {
                    throw new InvalidCycleSettings('Paramètres de cycle illisibles.');
                }

                return CycleSettings::fromArray($decoded);
            }

            /**
             * @return array<string, string>
             */
            public function set(Model $model, string $key, mixed $value, array $attributes): array
            {
                $settings = match (true) {
                    $value instanceof CycleSettings => $value,
                    is_array($value) => CycleSettings::fromArray($value),
                    default => throw new InvalidCycleSettings('Les paramètres de cycle doivent être un tableau ou un CycleSettings.'),
                };

                return [$key => json_encode($settings->toArray(), JSON_THROW_ON_ERROR)];
            }
        };
    }

    /**
     * @template T of BackedEnum
     *
     * @param  array<mixed>  $settings
     * @param  class-string<T>  $enum
     * @return T
     */
    private static function enum(array $settings, string $key, string $enum): BackedEnum
    {
        $value = $settings[$key] ?? null;

        if (! is_string($value)) {
            throw new InvalidCycleSettings("Paramètre de cycle manquant ou invalide : {$key}");
        }

        return $enum::tryFrom($value)
            ?? throw new InvalidCycleSettings("Valeur « {$value} » refusée pour le paramètre de cycle {$key}");
    }
}
