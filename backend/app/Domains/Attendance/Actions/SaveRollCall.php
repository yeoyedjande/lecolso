<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Actions;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Enums\AttendanceStatus;
use App\Domains\Attendance\Events\StudentMarkedAbsent;
use App\Domains\Attendance\Models\AttendanceCorrection;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Models\RollCall;
use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Attendance\Support\ClassRoster;
use App\Domains\Attendance\Support\RollCallWindow;
use App\Domains\Identity\Models\User;
use App\Support\Cycles\Enums\AttendanceMode;
use App\Support\Http\BusinessConflict;
use App\Support\Time\SchoolClock;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Enregistre (ou corrige) l'appel d'une classe pour un jour. Seuls les absents et retards sont stockés ; un élève
 * absent de la liste est présent. Le jour même : qui peut faire l'appel ; ensuite : la direction, motif obligatoire
 * (correction tracée). Les nouvelles absences émettent StudentMarkedAbsent après la transaction.
 */
final readonly class SaveRollCall
{
    public function __construct(private AttendanceAccess $access) {}

    /**
     * @param  list<array{student_id: string, status: AttendanceStatus, late_minutes: int|null}>  $marks
     *
     * @throws AuthorizationException
     * @throws BusinessConflict wrong_mode, year_closed, day_closed
     * @throws ValidationException date, marks, reason
     */
    public function handle(User $user, Classroom $classroom, string $date, array $marks, ?string $reason, Carbon $now, ?Carbon $recordedAt = null, ?string $id = null): RollCall
    {
        $classroom->loadMissing(['level.cycle', 'academicYear']);
        if (! $this->access->canTake($user, $classroom) && ! $this->access->canCorrect($user, $classroom)) {
            throw new AuthorizationException;
        }
        if ($classroom->level->cycle->settings->attendanceMode !== AttendanceMode::RollCall) {
            throw new BusinessConflict('wrong_mode', 'Ce cycle ne fait pas l’appel : arrivées et départs à la garderie.');
        }
        if ($classroom->academicYear->status === AcademicYearStatus::Closed) {
            throw new BusinessConflict('year_closed', 'Cette année scolaire est clôturée.');
        }
        $year = $classroom->academicYear;
        if ($date > SchoolClock::date($now) || $date < $year->starts_on->toDateString() || $date > $year->ends_on->toDateString()) {
            throw ValidationException::withMessages(['date' => 'Jour hors de l’année scolaire ou dans le futur.']);
        }

        $closed = RollCallWindow::isClosed($date, $now, $recordedAt);
        if ($closed && ! $this->access->canCorrect($user, $classroom)) {
            throw new BusinessConflict('day_closed', 'La journée est passée : seule la direction peut modifier cet appel.');
        }
        if (! $closed && ! $this->access->canTake($user, $classroom)) {
            throw new AuthorizationException;
        }
        if ($closed && ($reason === null || mb_strlen($reason) < 3)) {
            throw ValidationException::withMessages(['reason' => 'Indiquez le motif de la correction.']);
        }

        $enrolled = ClassRoster::on($classroom, $date)->modelKeys();
        foreach ($marks as $index => $mark) {
            if (! in_array($mark['student_id'], $enrolled, true)) {
                throw ValidationException::withMessages(["marks.{$index}.student_id" => 'Élève non inscrit dans cette classe ce jour-là.']);
            }
        }

        $newAbsents = [];
        $rollCall = DB::transaction(function () use ($user, $classroom, $date, $marks, $reason, $now, $closed, $id, &$newAbsents): RollCall {
            $rollCall = RollCall::query()->createOrFirst(
                ['classroom_id' => $classroom->id, 'date' => $date],
                ['id' => $id ?? (string) Str::uuid7(), 'taken_by' => $user->id, 'taken_by_name' => $user->name, 'taken_at' => $now],
            );
            $rollCall = RollCall::query()->whereKey($rollCall->id)->lockForUpdate()->firstOrFail();
            $rollCall->fill(['taken_by' => $user->id, 'taken_by_name' => $user->name, 'taken_at' => $now])->save();

            $existing = AttendanceMark::query()->where('roll_call_id', $rollCall->id)->get()->keyBy('student_id');
            $kept = [];
            foreach ($marks as $mark) {
                if ($mark['status'] === AttendanceStatus::Present) {
                    continue;
                }
                $kept[] = $mark['student_id'];
                $current = $existing->get($mark['student_id']);
                $attributes = [
                    'status' => $mark['status'],
                    'late_minutes' => $mark['status'] === AttendanceStatus::Late ? $mark['late_minutes'] : null,
                ];
                if ($current instanceof AttendanceMark) {
                    if ($current->status !== AttendanceStatus::Absent && $mark['status'] === AttendanceStatus::Absent) {
                        $newAbsents[] = $mark['student_id'];
                    }
                    $current->fill($attributes)->save();
                } else {
                    AttendanceMark::query()->create([...$attributes, 'roll_call_id' => $rollCall->id, 'student_id' => $mark['student_id'], 'date' => $date]);
                    if ($mark['status'] === AttendanceStatus::Absent) {
                        $newAbsents[] = $mark['student_id'];
                    }
                }
            }
            // Redevenu présent : la marque (et sa justification) disparaît
            AttendanceMark::query()->where('roll_call_id', $rollCall->id)->whereNotIn('student_id', $kept)->get()
                ->each(static fn (AttendanceMark $mark): ?bool => $mark->delete());

            if ($closed) {
                AttendanceCorrection::query()->create([
                    'roll_call_id' => $rollCall->id,
                    'reason' => (string) $reason,
                    'corrected_by' => $user->id,
                    'corrected_by_name' => $user->name,
                ]);
            }

            return $rollCall;
        });

        foreach ($newAbsents as $studentId) {
            StudentMarkedAbsent::dispatch($rollCall->school_id, $studentId, $date);
        }

        return $rollCall;
    }
}
