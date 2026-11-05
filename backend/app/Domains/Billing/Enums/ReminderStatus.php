<?php

declare(strict_types=1);

namespace App\Domains\Billing\Enums;

/** Relance : en file d'attente, envoyée, ou en échec (fournisseur SMS non configuré, refus de l'opérateur). */
enum ReminderStatus: string
{
    case Queued = 'queued';
    case Sent = 'sent';
    case Failed = 'failed';
}
