<?php

declare(strict_types=1);

namespace App\Domains\Billing\Enums;

/** Confirmation d'un paiement au payeur : en file, envoyée, en échec (motif noté), sans objet (aucun numéro de payeur). */
enum NotificationStatus: string
{
    case Queued = 'queued';
    case Sent = 'sent';
    case Failed = 'failed';
    case Skipped = 'skipped';
}
