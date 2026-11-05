<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Support;

use App\Support\Time\SchoolClock;
use Illuminate\Support\Carbon;

/**
 * Fenêtre de saisie d'un appel (décision du 05/11/2026) : le jour même (heure d'Abidjan), par qui fait l'appel ;
 * ensuite, correction par la direction avec un motif. Un appel fait hors connexion compte à l'heure où il a été
 * saisi sur l'appareil (`recorded_at`), s'il arrive dans les 72 heures : un réseau coupé ne le transforme pas en
 * correction.
 */
final class RollCallWindow
{
    public const int OFFLINE_GRACE_HOURS = 72;

    public static function isClosed(string $date, Carbon $now, ?Carbon $recordedAt = null): bool
    {
        if ($date >= SchoolClock::date($now)) {
            return false;
        }

        return $recordedAt === null
            || SchoolClock::date($recordedAt) !== $date
            || $recordedAt->greaterThan($now->copy()->addMinutes(5))
            || $recordedAt->lessThan($now->copy()->subHours(self::OFFLINE_GRACE_HOURS));
    }
}
