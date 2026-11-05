<?php

declare(strict_types=1);

namespace App\Domains\Academic\Enums;

/** Année scolaire ouverte (inscriptions, notes, présences) ou clôturée (consultation seulement). */
enum AcademicYearStatus: string
{
    case Open = 'open';
    case Closed = 'closed';
}
