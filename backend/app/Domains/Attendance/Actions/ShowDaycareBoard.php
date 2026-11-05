<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Data\DaycareBoardView;
use App\Domains\Attendance\Models\DaycareLog;
use App\Domains\Attendance\Models\DaycareVisit;
use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Attendance\Support\ClassRoster;
use App\Domains\Identity\Models\User;
use App\Support\Cycles\Enums\AttendanceMode;

/** Garderie d'un jour : classes des cycles en arrivées et départs que l'utilisateur voit. */
final readonly class ShowDaycareBoard
{
    public function __construct(private AttendanceAccess $access) {}

    public function handle(User $user, string $date): DaycareBoardView
    {
        $classrooms = $this->access->classrooms($user)
            ->filter(static fn (Classroom $classroom): bool => $classroom->level->cycle->settings->attendanceMode === AttendanceMode::CheckInOut)
            ->values();

        $board = [];
        foreach ($classrooms as $classroom) {
            $students = ClassRoster::on($classroom, $date);
            $visits = DaycareVisit::query()->whereIn('student_id', $students->modelKeys())->whereDate('date', $date)->get()->keyBy('student_id');
            $logs = [];
            foreach (DaycareLog::query()->whereIn('student_id', $students->modelKeys())->whereDate('date', $date)->orderBy('time')->get() as $log) {
                $logs[$log->student_id][] = $log;
            }

            $children = [];
            foreach ($students as $student) {
                $visit = $visits->get($student->id);
                $children[] = [
                    'student' => $student,
                    'visit' => $visit instanceof DaycareVisit ? $visit : null,
                    'logs' => $logs[$student->id] ?? [],
                ];
            }
            $board[] = ['classroom' => $classroom, 'can_record' => $this->access->canTake($user, $classroom), 'children' => $children];
        }

        return new DaycareBoardView($date, $board);
    }
}
