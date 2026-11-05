<?php

declare(strict_types=1);

namespace App\Domains\Billing\Enums;

/** Ligne de facture : frais de la grille, remise (négative) ou ligne ajoutée à la main. */
enum LineKind: string
{
    case Fee = 'fee';
    case Discount = 'discount';
    case Manual = 'manual';
}
