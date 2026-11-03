<?php

declare(strict_types=1);

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Tenancy\Models\School;

/** Une école de l'utilisateur, avec ses rôles et ses permissions (null = toute l'école, sinon les cycles). */
final readonly class SchoolMembership
{
    /**
     * @param  list<RoleAssignment>  $assignments
     * @param  array<string, list<string>|null>  $permissions
     */
    public function __construct(
        public School $school,
        public array $assignments,
        public array $permissions,
    ) {}
}
