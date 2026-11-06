<?php

declare(strict_types=1);

namespace App\Domains\Billing\Enums;

/** État d'une demande de paiement Mobile Money : en attente de validation sur le téléphone, réussie, échouée, expirée. */
enum PaymentIntentStatus: string
{
    case Pending = 'pending';
    case Succeeded = 'succeeded';
    case Failed = 'failed';
    case Expired = 'expired';
}
