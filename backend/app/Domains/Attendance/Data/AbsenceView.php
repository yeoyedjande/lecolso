<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Data;

use App\Domains\Attendance\Models\AttendanceMark;

/** Absence ou retard tel que l'utilisateur le voit : droit de décider d'une justification, de justifier. */
final readonly class AbsenceView
{
    public function __construct(
        public AttendanceMark $mark,
        public bool $canDecide,
    ) {}
}
