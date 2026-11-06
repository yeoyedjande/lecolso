<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Billing\Data\MobileMoneyFees;
use App\Domains\Billing\Enums\DeparturePolicy;
use App\Domains\Billing\Enums\FeePayer;
use App\Domains\Tenancy\Models\School;

/** Politique financière d'une école (schools.settings), avec la valeur par défaut décidée le 05/11/2026. */
final class FinancialPolicy
{
    public const string DEPARTURE_KEY = 'billing_departure';

    public const string MOBILE_MONEY_KEY = 'billing_mobile_money';

    public static function departure(?School $school): DeparturePolicy
    {
        $value = $school?->settings[self::DEPARTURE_KEY] ?? null;

        return (is_string($value) ? DeparturePolicy::tryFrom($value) : null) ?? DeparturePolicy::CancelUnstarted;
    }

    /** Frais Mobile Money : à la charge de l'école, sans taux, tant que l'école ne les a pas réglés. */
    public static function mobileMoney(?School $school): MobileMoneyFees
    {
        $value = $school?->settings[self::MOBILE_MONEY_KEY] ?? null;
        $payer = is_array($value) && is_string($value['fee_payer'] ?? null) ? FeePayer::tryFrom($value['fee_payer']) : null;
        $rate = is_array($value) && is_int($value['fee_rate_bps'] ?? null) ? $value['fee_rate_bps'] : 0;

        return new MobileMoneyFees($payer ?? FeePayer::School, max(0, min(MobileMoneyFees::MAX_RATE_BPS, $rate)));
    }
}
