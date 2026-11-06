<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Enums;

/** Public d'une annonce : toute l'école, un cycle, ou une classe. */
enum AnnouncementAudience: string
{
    case School = 'school';
    case Cycle = 'cycle';
    case Classroom = 'classroom';
}
