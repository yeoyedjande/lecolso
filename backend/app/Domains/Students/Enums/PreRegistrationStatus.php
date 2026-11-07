<?php

declare(strict_types=1);

namespace App\Domains\Students\Enums;

/** Pré-inscription : en attente du secrétariat, refusée (motif), ou inscrite (élève créé par l'inscription pré-remplie). */
enum PreRegistrationStatus: string
{
    case Pending = 'pending';
    case Refused = 'refused';
    case Enrolled = 'enrolled';
}
