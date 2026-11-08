<?php

declare(strict_types=1);

namespace App\Domains\Students\Enums;

/** Lien entre un tuteur et l'élève. */
enum GuardianRelation: string
{
    case Father = 'father';
    case Mother = 'mother';
    case Guardian = 'guardian';
    case Other = 'other';
}
