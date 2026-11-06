<?php

declare(strict_types=1);

namespace App\Domains\Grading\Enums;

/** Mention d'un bulletin : félicitations, tableau d'honneur, encouragements, avertissement. */
enum Mention: string
{
    case Congratulations = 'congratulations';
    case HonorRoll = 'honor_roll';
    case Encouragement = 'encouragement';
    case Warning = 'warning';

    public function label(): string
    {
        return match ($this) {
            self::Congratulations => 'Félicitations',
            self::HonorRoll => 'Tableau d’honneur',
            self::Encouragement => 'Encouragements',
            self::Warning => 'Avertissement',
        };
    }
}
