<?php

declare(strict_types=1);

namespace App\Support\Cycles\Enums;

/** Type de période (paramètre du cycle). */
enum TermType: string
{
    /** Trimestres */
    case Trimester = 'trimester';

    /** Semestres (V2) */
    case Semester = 'semester';

    /** Périodes libres */
    case FreePeriod = 'free_period';

}
