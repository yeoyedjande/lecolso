<?php

declare(strict_types=1);

namespace App\Support\Cycles\Enums;

/** Périodicité de facturation (paramètre du cycle). */
enum BillingPeriod: string
{
    /** Mensuelle */
    case Monthly = 'monthly';

    /** Trimestrielle */
    case Quarterly = 'quarterly';

    /** Annuelle */
    case Yearly = 'yearly';

}
