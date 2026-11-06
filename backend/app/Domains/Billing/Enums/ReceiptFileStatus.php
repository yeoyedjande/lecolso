<?php

declare(strict_types=1);

namespace App\Domains\Billing\Enums;

/** Reçu PDF : en cours de rendu, prêt, ou en échec (un nouveau rendu est demandé à la lecture suivante). */
enum ReceiptFileStatus: string
{
    case Pending = 'pending';
    case Ready = 'ready';
    case Failed = 'failed';
}
