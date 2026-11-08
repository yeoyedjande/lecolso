<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Enums\AttendanceStatus;
use App\Domains\Attendance\Enums\DaycareLogKind;
use App\Domains\Attendance\Models\SyncOperation;
use App\Domains\Grading\Actions\SaveAssessment;
use App\Domains\Grading\Actions\SaveGrades;
use App\Domains\Grading\Actions\SaveSkillEvaluations;
use App\Domains\Grading\Http\Requests\AssessmentRules;
use App\Domains\Grading\Models\Assessment;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use App\Support\Http\BusinessConflict;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * File hors connexion (POST /sync) : chaque opération porte l'UUID généré par l'appareil. Une opération déjà traitée
 * renvoie son premier résultat sans être rejouée ; les autres passent par les mêmes Actions et les mêmes droits que
 * l'API en ligne, chacune dans sa transaction. Types : attendance.roll_call, daycare.check, daycare.log ;
 * grades.assessment (évaluation créée sur l'appareil), grades.save (notes), skills.save (compétences).
 */
final readonly class ApplySyncOperations
{
    public const array TYPES = ['attendance.roll_call', 'daycare.check', 'daycare.log', 'grades.assessment', 'grades.save', 'skills.save'];

    public function __construct(
        private SaveRollCall $rollCall,
        private RecordDaycare $daycare,
        private SaveAssessment $assessment,
        private SaveGrades $grades,
        private SaveSkillEvaluations $skills,
    ) {}

    /**
     * @param  list<array{id: string, type: string, payload: array<string, mixed>}>  $operations
     * @return list<array{id: string, status: string, code: string|null, message: string|null, replayed: bool}>
     */
    public function handle(User $user, array $operations, Carbon $now): array
    {
        $results = [];
        foreach ($operations as $operation) {
            $done = SyncOperation::query()->find($operation['id']);
            if ($done instanceof SyncOperation) {
                $results[] = $this->result($done, true);

                continue;
            }

            try {
                // Opération réservée puis appliquée dans la même transaction : un second envoi simultané attend
                // sur la clé primaire, puis relit le résultat ; une panne n'enregistre ni l'une ni l'autre.
                $stored = DB::transaction(function () use ($user, $operation, $now): SyncOperation {
                    $stored = SyncOperation::query()->create([
                        'id' => $operation['id'],
                        'user_id' => $user->id,
                        'type' => $operation['type'],
                        'status' => 'applied',
                        'result' => ['code' => null, 'message' => null],
                    ]);
                    [$status, $code, $message] = $this->apply($user, $operation['type'], $operation['payload'], $now);
                    if ($status !== 'applied') {
                        $stored->fill(['status' => $status, 'result' => ['code' => $code, 'message' => $message]])->save();
                    }

                    return $stored;
                });
            } catch (UniqueConstraintViolationException) {
                $results[] = $this->result(SyncOperation::query()->findOrFail($operation['id']), true);

                continue;
            }
            $results[] = $this->result($stored, false);
        }

        return $results;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: string, 1: string|null, 2: string|null}
     */
    private function apply(User $user, string $type, array $payload, Carbon $now): array
    {
        try {
            $data = Validator::make($payload, $this->rules($type))->validate();
            $recordedAt = Carbon::parse(self::text($data, 'recorded_at'));

            match ($type) {
                'grades.assessment' => $this->assessment->handle(
                    $user,
                    Classroom::query()->findOrFail(self::text($data, 'classroom_id')),
                    AssessmentRules::data($data),
                    null,
                    self::text($data, 'assessment_id'),
                ),
                'grades.save' => $this->grades->handle($user, Assessment::query()->findOrFail(self::text($data, 'assessment_id')), AssessmentRules::grades($data), $recordedAt),
                'skills.save' => $this->skills->handle(
                    $user,
                    Classroom::query()->findOrFail(self::text($data, 'classroom_id')),
                    self::text($data, 'term_id'),
                    AssessmentRules::evaluations($data),
                    $recordedAt,
                ),
                'attendance.roll_call' => $this->rollCall->handle(
                    $user,
                    Classroom::query()->findOrFail(self::text($data, 'classroom_id')),
                    self::text($data, 'date'),
                    self::marks($data),
                    isset($data['reason']) && is_string($data['reason']) ? trim($data['reason']) : null,
                    $now,
                    $recordedAt,
                    self::optional($data, 'roll_call_id'),
                ),
                'daycare.check' => $this->daycare->check(
                    $user,
                    Student::query()->findOrFail(self::text($data, 'student_id')),
                    self::text($data, 'date'),
                    self::text($data, 'direction'),
                    self::text($data, 'time'),
                    isset($data['person']) && is_string($data['person']) ? trim($data['person']) : null,
                    $now,
                    $recordedAt,
                ),
                default => $this->daycare->log(
                    $user,
                    Student::query()->findOrFail(self::text($data, 'student_id')),
                    self::text($data, 'date'),
                    self::text($data, 'time'),
                    DaycareLogKind::from(self::text($data, 'kind')),
                    trim(self::text($data, 'note')),
                    $now,
                    $recordedAt,
                    self::optional($data, 'log_id'),
                ),
            };

            return ['applied', null, null];
        } catch (ValidationException $error) {
            return ['rejected', 'invalid', $error->getMessage()];
        } catch (BusinessConflict $error) {
            return ['rejected', $error->errorCode, $error->getMessage()];
        } catch (AuthorizationException) {
            return ['rejected', 'forbidden', 'Action non autorisée.'];
        } catch (ModelNotFoundException) {
            return ['rejected', 'not_found', 'Classe, élève ou évaluation introuvable.'];
        }
    }

    /**
     * @return array<string, list<mixed>>
     */
    private function rules(string $type): array
    {
        $common = ['recorded_at' => ['required', 'date'], 'date' => ['required', 'date_format:Y-m-d']];

        return match ($type) {
            'grades.assessment' => [...AssessmentRules::rules(), 'recorded_at' => ['required', 'date'], 'assessment_id' => ['required', 'uuid'], 'classroom_id' => ['required', 'uuid']],
            'grades.save' => [...AssessmentRules::gradeRules(), 'recorded_at' => ['required', 'date'], 'assessment_id' => ['required', 'uuid']],
            'skills.save' => [...AssessmentRules::skillRules(), 'recorded_at' => ['required', 'date'], 'classroom_id' => ['required', 'uuid']],
            'attendance.roll_call' => [...$common,
                'roll_call_id' => ['nullable', 'uuid'],
                'classroom_id' => ['required', 'uuid'],
                'marks' => ['present', 'array', 'max:200'],
                'marks.*.student_id' => ['required', 'uuid'],
                'marks.*.status' => ['required', 'in:present,absent,late'],
                'marks.*.late_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
                'reason' => ['nullable', 'string', 'max:200'],
            ],
            'daycare.check' => [...$common,
                'student_id' => ['required', 'uuid'],
                'direction' => ['required', 'in:in,out'],
                'time' => ['required', 'date_format:H:i'],
                'person' => ['nullable', 'string', 'max:120'],
            ],
            default => [...$common,
                'log_id' => ['nullable', 'uuid'],
                'student_id' => ['required', 'uuid'],
                'time' => ['required', 'date_format:H:i'],
                'kind' => ['required', 'in:meal,nap,diaper,mood,activity,health'],
                'note' => ['required', 'string', 'max:500'],
            ],
        };
    }

    /**
     * @param  array<array-key, mixed>  $data
     * @return list<array{student_id: string, status: AttendanceStatus, late_minutes: int|null}>
     */
    public static function marks(array $data): array
    {
        $marks = [];
        foreach (is_array($data['marks'] ?? null) ? $data['marks'] : [] as $mark) {
            if (! is_array($mark) || ! is_string($mark['student_id'] ?? null) || ! is_string($mark['status'] ?? null)) {
                continue;
            }
            $marks[] = [
                'student_id' => $mark['student_id'],
                'status' => AttendanceStatus::from($mark['status']),
                'late_minutes' => is_numeric($mark['late_minutes'] ?? null) ? (int) $mark['late_minutes'] : null,
            ];
        }

        return $marks;
    }

    /**
     * @param  array<array-key, mixed>  $data
     */
    private static function text(array $data, string $key): string
    {
        $value = $data[$key] ?? null;

        return is_string($value) ? $value : '';
    }

    /**
     * @param  array<array-key, mixed>  $data
     */
    private static function optional(array $data, string $key): ?string
    {
        $value = $data[$key] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * @return array{id: string, status: string, code: string|null, message: string|null, replayed: bool}
     */
    private function result(SyncOperation $operation, bool $replayed): array
    {
        $code = $operation->result['code'] ?? null;
        $message = $operation->result['message'] ?? null;

        return [
            'id' => $operation->id,
            'status' => $operation->status,
            'code' => is_string($code) ? $code : null,
            'message' => is_string($message) ? $message : null,
            'replayed' => $replayed,
        ];
    }
}
