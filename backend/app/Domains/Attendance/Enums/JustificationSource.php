<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Enums;

/** Qui a justifié : le parent (depuis son espace, à valider) ou l'école (saisie directe, acceptée). */
enum JustificationSource: string
{
    case Guardian = 'guardian';
    case School = 'school';
}
