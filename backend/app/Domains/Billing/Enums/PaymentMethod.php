<?php

declare(strict_types=1);

namespace App\Domains\Billing\Enums;

/** Moyen de paiement au guichet. Seules les espèces se comptent dans la caisse ; les autres exigent une référence. */
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
}
