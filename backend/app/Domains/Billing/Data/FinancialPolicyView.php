<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

use App\Domains\Billing\Enums\DeparturePolicy;

/** Politique financière d'une école : départs en cours d'année, frais Mobile Money. */
final readonly class FinancialPolicyView
{
    public function __construct(
        public DeparturePolicy $departure,
        public MobileMoneyFees $mobileMoney,
    ) {}
}
