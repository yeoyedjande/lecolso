<?php

declare(strict_types=1);

namespace App\Domains\Billing\Enums;

/** Qui paie une facture : le tuteur payeur (V1), l'élève lui-même ou une entreprise (prévu). */
enum PayerKind: string
{
    case Guardian = 'guardian';
    case Student = 'student';
    case Company = 'company';
}
