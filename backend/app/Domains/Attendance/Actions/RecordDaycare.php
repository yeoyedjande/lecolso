<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Enums\DaycareLogKind;
use App\Domains\Attendance\Models\DaycareLog;
use App\Domains\Attendance\Models\DaycareVisit;
use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Attendance\Support\RollCallWindow;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use App\Support\Cycles\Enums\AttendanceMode;
use App\Support\Http\BusinessConflict;
use App\Support\Time\SchoolClock;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Garderie : arrivée ou départ d'un enfant (heure, personne qui le dépose ou le récupère) et journal de la journée.
 * Le jour même (ou hors connexion, à l'heure de saisie sur l'appareil), par qui fait l'appel de sa classe.
 */
final readonly class RecordDaycare
{
    public function __construct(private AttendanceAccess $access) {}

    /**
     * @throws AuthorizationException
     * @throws BusinessConflict not_enrolled, wrong_mode, day_closed
     */
    public function check(User $user, Student $student, string $date, string $direction, string $time, ?string $person, Carbon $now, ?Carbon $recordedAt = null, ?string $id = null): DaycareVisit
    {
        $this->assertAllowed($user, $student, $date, $now, $recordedAt);

        return DB::transaction(static function () use ($student, $date, $direction, $time, $person, $id): DaycareVisit {
            $visit = DaycareVisit::query()->createOrFirst(['student_id' => $student->id, 'date' => $date], array_filter(['id' => $id]));
            $visit = DaycareVisit::query()->whereKey($visit->id)->lockForUpdate()->firstOrFail();
            $visit->fill($direction === 'in'
                ? ['arrived_at' => $time, 'dropped_by' => $person]
                : ['left_at' => $time, 'picked_up_by' => $person])->save();

            return $visit;
        });
    }

    /**
     * @throws AuthorizationException
     * @throws BusinessConflict not_enrolled, wrong_mode, day_closed
     */
    public function log(User $user, Student $student, string $date, string $time, DaycareLogKind $kind, string $note, Carbon $now, ?Carbon $recordedAt = null, ?string $id = null): DaycareLog
    {
        $this->assertAllowed($user, $student, $date, $now, $recordedAt);

        // Hors connexion : un même envoi rejoué ne crée pas deux entrées
        $existing = $id === null ? null : DaycareLog::query()->find($id);

        return $existing ?? DaycareLog::query()->create(array_filter([
            'id' => $id,
            'student_id' => $student->id,
            'date' => $date,
            'time' => $time,
            'kind' => $kind,
            'note' => $note,
            'created_by' => $user->id,
        ], static fn (mixed $value): bool => $value !== null));
    }

    private function assertAllowed(User $user, Student $student, string $date, Carbon $now, ?Carbon $recordedAt): void
    {
        if ($date > SchoolClock::date($now)) {
            throw ValidationException::withMessages(['date' => 'Jour dans le futur.']);
        }
        $enrollment = Enrollment::query()->where('student_id', $student->id)
            ->where('enrolled_on', '<=', $date)
            ->where(static fn (Builder $q) => $q->where('status', EnrollmentStatus::Active)->orWhere('left_on', '>', $date))
            ->orderByDesc('enrolled_on')
            ->first();
        $classroom = $enrollment?->classroom()->with('level.cycle')->first();
        if (! $classroom instanceof Classroom) {
            throw new BusinessConflict('not_enrolled', 'Cet enfant n’est inscrit dans aucune classe ce jour-là.');
        }
        if (! $this->access->canTake($user, $classroom)) {
            throw new AuthorizationException;
        }
        if ($classroom->level->cycle->settings->attendanceMode !== AttendanceMode::CheckInOut) {
            throw new BusinessConflict('wrong_mode', 'Ce cycle fait l’appel en classe, pas les arrivées et départs.');
        }
        if (RollCallWindow::isClosed($date, $now, $recordedAt)) {
            throw new BusinessConflict('day_closed', 'La journée de garderie est passée.');
        }
    }
}
