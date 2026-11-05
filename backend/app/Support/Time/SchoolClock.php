<?php

declare(strict_types=1);

namespace App\Support\Time;

use Illuminate\Support\Carbon;

/** Jour et heure de l'école (Africa/Abidjan, config app.display_timezone) : jour d'appel, de caisse, de garderie. */
final class SchoolClock
{
    public static function timezone(): string
    {
        $timezone = config('app.display_timezone');

        return is_string($timezone) ? $timezone : 'Africa/Abidjan';
    }

    /** Date AAAA-MM-JJ du moment donné (maintenant par défaut) à l'heure de l'école. */
    public static function date(?Carbon $at = null): string
    {
        return ($at ?? Carbon::now())->copy()->setTimezone(self::timezone())->toDateString();
    }
}
