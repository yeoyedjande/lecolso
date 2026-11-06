<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Data;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Models\DaycareLog;
use App\Domains\Attendance\Models\DaycareVisit;
use App\Domains\Students\Models\Student;

/** Tableau de garderie d'un jour : classes en arrivées et départs, enfants, passage du jour, journal, droit d'écrire. */
final readonly class DaycareBoardView
{
    /**
     * @param  list<array{classroom: Classroom, can_record: bool, children: list<array{student: Student, visit: DaycareVisit|null, logs: list<DaycareLog>}>}>  $classrooms
     */
    public function __construct(
        public string $date,
        public array $classrooms,
    ) {}
}
