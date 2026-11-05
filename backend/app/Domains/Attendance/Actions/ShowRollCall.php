<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Data\RollCallView;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Models\RollCall;
use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Attendance\Support\ClassRoster;
use App\Domains\Attendance\Support\RollCallWindow;
use App\Domains\Identity\Models\User;
use App\Support\Time\SchoolClock;
use Illuminate\Support\Carbon;

/** Appel d'une classe pour un jour, avec les élèves inscrits ce jour-là. */
final readonly class ShowRollCall
{
    public function __construct(private AttendanceAccess $access) {}

    public function handle(User $user, Classroom $classroom, string $date, Carbon $now): RollCallView
    {
        $classroom->loadMissing(['level.cycle', 'academicYear']);
        $rollCall = RollCall::query()->where('classroom_id', $classroom->id)->whereDate('date', $date)
            ->with('corrections')
            ->first();
        $marks = $rollCall === null ? collect() : AttendanceMark::query()->where('roll_call_id', $rollCall->id)
            ->with('justification')
            ->get()
            ->keyBy('student_id');

        $rows = [];
        foreach (ClassRoster::on($classroom, $date) as $student) {
            $mark = $marks->get($student->id);
            $rows[] = ['student' => $student, 'mark' => $mark instanceof AttendanceMark ? $mark : null];
        }

        $closed = RollCallWindow::isClosed($date, $now);
        $canTake = $this->access->canTake($user, $classroom);

        return new RollCallView(
            $classroom,
            $date,
            $rollCall,
            $rows,
            $date <= SchoolClock::date($now) && ($closed ? $this->access->canCorrect($user, $classroom) : $canTake),
            $closed,
        );
    }
}
