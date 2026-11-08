<?php

declare(strict_types=1);

namespace App\Domains\Billing\Enums;

/**
 * Moyen de paiement (guichet, ou Mobile Money en ligne par le parent). Seules les espèces se comptent dans la caisse ;
 * les autres exigent une référence.
 */
enum PaymentMethod: string
{
    case Cash = 'cash';
    case OrangeMoney = 'orange_money';
    case MtnMomo = 'mtn_momo';
    case MoovMoney = 'moov_money';
    case Wave = 'wave';
    case Cheque = 'cheque';
    case Transfer = 'transfer';

    public function needsReference(): bool
    {
        return $this !== self::Cash;
    }

    /** Opérateur Mobile Money (paiement en ligne par le parent). */
    public function isMobileMoney(): bool
    {
        return in_array($this, [self::OrangeMoney, self::MtnMomo, self::MoovMoney, self::Wave], true);
    }
}
