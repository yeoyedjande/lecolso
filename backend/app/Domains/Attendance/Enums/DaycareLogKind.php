<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Enums;

/** Entrée du journal de garderie. Une note de santé n'est jamais journalisée. */
enum DaycareLogKind: string
{
    case Meal = 'meal';
    case Nap = 'nap';
    case Diaper = 'diaper';
    case Mood = 'mood';
    case Activity = 'activity';
    case Health = 'health';
}
