<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Data\PlannedAbsenceView;
use App\Domains\Attendance\Enums\JustificationStatus;
use App\Domains\Attendance\Models\PlannedAbsence;
use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Support\CurrentClassroom;
use App\Support\Time\SchoolClock;
use Illuminate\Support\Carbon;

/**
 * Absences annoncées par les parents dans les classes que l'utilisateur voit : en attente, puis à venir ou en cours,
 * par date de début.
 */
final readonly class ListPlannedAbsences
{
    public function __construct(private AttendanceAccess $access) {}

    /**
     * @return list<PlannedAbsenceView>
     */
    public function handle(User $user, bool $pendingOnly, Carbon $now): array
    {
        $today = SchoolClock::date($now);
        $classrooms = $this->access->classrooms($user)->keyBy('id');
        if ($classrooms->isEmpty()) {
            return [];
        }

        $views = [];
        $planned = PlannedAbsence::query()
            ->when($pendingOnly, static fn ($q) => $q->where('status', JustificationStatus::Pending))
            ->when(! $pendingOnly, static fn ($q) => $q->whereDate('ends_on', '>=', $today))
            ->whereHas('student.enrollments', static fn ($q) => $q->whereIn('classroom_id', $classrooms->keys()))
            ->with('student')
            ->orderBy('starts_on')
            ->get();
        foreach ($planned as $absence) {
            $classroom = $classrooms->get(CurrentClassroom::of($absence->student_id, $today)?->id);
            if ($classroom instanceof Classroom) {
                $views[] = new PlannedAbsenceView($absence, $classroom, $this->access->canDecide($user, $classroom));
            }
        }

        return $views;
    }
}
