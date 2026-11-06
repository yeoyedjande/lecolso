<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Data;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Models\PlannedAbsence;

/** Absence annoncée vue par l'école : classe de l'enfant et droit de décider. */
final readonly class PlannedAbsenceView
{
    public function __construct(
        public PlannedAbsence $planned,
        public Classroom $classroom,
        public bool $canDecide,
    ) {}
}
