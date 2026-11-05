<?php

declare(strict_types=1);

namespace App\Domains\Students\Enums;

/** Groupe sanguin (donnée médicale : permission students.medical.view, jamais journalisée). */
enum BloodType: string
{
    case APositive = 'A+';
    case ANegative = 'A-';
    case BPositive = 'B+';
    case BNegative = 'B-';
    case AbPositive = 'AB+';
    case AbNegative = 'AB-';
    case OPositive = 'O+';
    case ONegative = 'O-';
}
