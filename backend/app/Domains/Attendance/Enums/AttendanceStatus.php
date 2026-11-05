<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Enums;

/** Statut d'un élève à l'appel. Seuls absent et late sont stockés ; « excusé » vient d'une justification acceptée. */
enum AttendanceStatus: string
{
    case Present = 'present';
    case Absent = 'absent';
    case Late = 'late';
}
