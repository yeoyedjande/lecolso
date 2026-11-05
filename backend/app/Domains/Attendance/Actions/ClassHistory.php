<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Enums\AttendanceStatus;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Models\RollCall;
use App\Domains\Attendance\Support\ClassRoster;
use App\Support\Time\SchoolClock;
use Illuminate\Support\Carbon;

/**
 * Historique d'une classe : pour chaque jour ouvré (lundi au vendredi) de la période, jusqu'à aujourd'hui, appel fait
 * ou non, présents, absents, retards. Le calendrier des congés viendra avec le lot Communication.
 */
final class ClassHistory
{
    /**
     * @return list<array{date: string, taken: bool, present: int, absent: int, late: int}>
     */
    public function handle(Classroom $classroom, string $from, string $to, Carbon $now): array
    {
        $today = SchoolClock::date($now);
        $end = min($to, $today);
        $calls = RollCall::query()->where('classroom_id', $classroom->id)->whereBetween('date', [$from, $end])->get()
            ->keyBy(static fn (RollCall $call): string => $call->date->toDateString());
        $counts = [];
        foreach (AttendanceMark::query()->whereIn('roll_call_id', $calls->pluck('id'))->get() as $mark) {
            $key = $mark->date->toDateString();
            $counts[$key] ??= ['absent' => 0, 'late' => 0];
            $counts[$key][$mark->status === AttendanceStatus::Absent ? 'absent' : 'late']++;
        }

        $days = [];
        for ($day = Carbon::parse($from); $day->toDateString() <= $end; $day->addDay()) {
            if ($day->isWeekend()) {
                continue;
            }
            $date = $day->toDateString();
            $taken = $calls->has($date);
            $absent = $counts[$date]['absent'] ?? 0;
            $late = $counts[$date]['late'] ?? 0;
            $days[] = [
                'date' => $date,
                'taken' => $taken,
                'present' => $taken ? max(0, ClassRoster::on($classroom, $date)->count() - $absent) : 0,
                'absent' => $absent,
                'late' => $late,
            ];
        }

        return $days;
    }
}
