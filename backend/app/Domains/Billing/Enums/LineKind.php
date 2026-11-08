<?php

declare(strict_types=1);

namespace App\Domains\Billing\Enums;

/**
 * Ligne de facture : frais de la grille, remise (négative), ligne ajoutée à la main, ou départ (négative : échéances
 * des périodes non commencées à la date du départ, annulées).
 */
enum LineKind: string
{
    case Fee = 'fee';
    case Discount = 'discount';
    case Manual = 'manual';
    case Departure = 'departure';
}
