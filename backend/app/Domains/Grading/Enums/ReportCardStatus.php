<?php

declare(strict_types=1);

namespace App\Domains\Grading\Enums;

/** Rendu d'un bulletin PDF : en attente (file), prêt, échoué. */
enum ReportCardStatus: string
{
    case Pending = 'pending';
    case Ready = 'ready';
    case Failed = 'failed';
}
