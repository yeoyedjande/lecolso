<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Enums;

/** Type d'établissement (ADR 0003) : seul preschool_primary est disponible en V1. */
enum SchoolType: string
{
    case PreschoolPrimary = 'preschool_primary';
    case Secondary = 'secondary';
    case Higher = 'higher';
}
