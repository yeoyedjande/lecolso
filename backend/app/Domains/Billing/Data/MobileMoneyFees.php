<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

use App\Domains\Billing\Enums\FeePayer;

/**
 * Frais Mobile Money d'une école (décision du 06/11/2026 : réglage par école) : qui les paie et leur taux en points de
 * base (150 = 1,5 %), arrondis à l'entier supérieur (FCFA).
 */
final readonly class MobileMoneyFees
{
    public const int MAX_RATE_BPS = 1000;

    public function __construct(
        public FeePayer $payer,
        public int $rateBps,
    ) {}

    public function feeFor(int $amount): int
    {
        return intdiv($amount * $this->rateBps + 9999, 10000);
    }

    /** Montant débité au parent pour créditer `amount` sur la facture. */
    public function chargedFor(int $amount): int
    {
        return $this->payer === FeePayer::Guardian ? $amount + $this->feeFor($amount) : $amount;
    }
}
