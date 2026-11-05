<?php

declare(strict_types=1);

namespace App\Domains\Billing\Enums;

/**
 * Politique financière d'une école au départ d'un élève (schools.settings.billing_departure).
 * Par défaut : les échéances des périodes non commencées à la date du départ sont annulées (décision du 05/11/2026).
 */
enum DeparturePolicy: string
{
    case CancelUnstarted = 'cancel_unstarted';
    case KeepAll = 'keep_all';
}
