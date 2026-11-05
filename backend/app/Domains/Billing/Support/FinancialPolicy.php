<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Billing\Enums\DeparturePolicy;
use App\Domains\Tenancy\Models\School;

/** Politique financière d'une école (schools.settings), avec la valeur par défaut décidée le 05/11/2026. */
final class FinancialPolicy
{
    public const string DEPARTURE_KEY = 'billing_departure';

    public static function departure(?School $school): DeparturePolicy
    {
        $value = $school?->settings[self::DEPARTURE_KEY] ?? null;

        return (is_string($value) ? DeparturePolicy::tryFrom($value) : null) ?? DeparturePolicy::CancelUnstarted;
    }
}
