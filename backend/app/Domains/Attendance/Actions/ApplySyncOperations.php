<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Enums\AttendanceStatus;
use App\Domains\Attendance\Enums\DaycareLogKind;
use App\Domains\Attendance\Models\SyncOperation;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use App\Support\Http\BusinessConflict;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * File hors connexion (POST /sync) : chaque opération porte l'UUID généré par l'appareil. Une opération déjà traitée
 * renvoie son premier résultat sans être rejouée ; les autres passent par les mêmes Actions et les mêmes droits que
 * l'API en ligne, chacune dans sa transaction. Types : attendance.roll_call, daycare.check, daycare.log.
 */
final readonly class ApplySyncOperations
{
    public const array TYPES = ['attendance.roll_call', 'daycare.check', 'daycare.log'];

    public function __construct(
        private SaveRollCall $rollCall,
        private RecordDaycare $daycare,
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

            [$status, $code, $message] = $this->apply($user, $operation['type'], $operation['payload'], $now);
            try {
                $stored = SyncOperation::query()->create([
                    'id' => $operation['id'],
                    'user_id' => $user->id,
                    'type' => $operation['type'],
                    'status' => $status,
                    'result' => ['code' => $code, 'message' => $message],
                ]);
            } catch (UniqueConstraintViolationException) {
                // Même opération envoyée au même instant par un autre onglet
                $stored = SyncOperation::query()->findOrFail($operation['id']);
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
            return ['rejected', 'not_found', 'Classe ou élève introuvable.'];
        }
    }

    /**
     * @return array<string, list<mixed>>
     */
    private function rules(string $type): array
    {
        $common = ['recorded_at' => ['required', 'date'], 'date' => ['required', 'date_format:Y-m-d']];

        return match ($type) {
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
