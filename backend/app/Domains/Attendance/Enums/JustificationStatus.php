<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Enums;

/** Justification d'absence : en attente de l'école, acceptée (absence excusée) ou refusée. */
enum JustificationStatus: string
{
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Refused = 'refused';
}
