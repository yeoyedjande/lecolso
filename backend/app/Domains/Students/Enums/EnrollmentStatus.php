<?php

declare(strict_types=1);

namespace App\Domains\Students\Enums;

/** Inscription en cours, ou élève parti en cours d'année (date et motif conservés). */
enum EnrollmentStatus: string
{
    case Active = 'active';
    case Left = 'left';
}
