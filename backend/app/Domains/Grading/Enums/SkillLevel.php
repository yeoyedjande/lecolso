<?php

declare(strict_types=1);

namespace App\Domains\Grading\Enums;

/** Niveau d'une compétence pour une période : acquis, en cours d'acquisition, non acquis. */
enum SkillLevel: string
{
    case Acquired = 'A';
    case InProgress = 'EA';
    case NotAcquired = 'NA';
}
