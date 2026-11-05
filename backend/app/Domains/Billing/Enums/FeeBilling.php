<?php

declare(strict_types=1);

namespace App\Domains\Billing\Enums;

/** Facturation d'un type de frais : en une fois à l'inscription, ou réparti sur les échéances du cycle. */
enum FeeBilling: string
{
    case Once = 'once';
    case Recurring = 'recurring';
}
