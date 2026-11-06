<?php

declare(strict_types=1);

namespace App\Domains\Academic\Enums;

/** Type d'un événement du calendrier de l'école. */
enum SchoolEventKind: string
{
    case Holiday = 'holiday';
    case Exam = 'exam';
    case Meeting = 'meeting';
    case Event = 'event';
    case Training = 'training';
}
