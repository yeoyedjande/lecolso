<?php

declare(strict_types=1);

namespace App\Domains\Billing\Enums;

/** Qui paie les frais Mobile Money : l'école (déduits au reversement) ou le parent (ajoutés au montant débité). */
enum FeePayer: string
{
    case School = 'school';
    case Guardian = 'guardian';
}
