<?php

declare(strict_types=1);

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\User;

/** Un compte de l'école courante, ses affectations, son statut et ce que l'acteur peut en faire. */
final readonly class SchoolUser
{
    /**
     * @param  list<UserAssignment>  $assignments
     */
    public function __construct(
        public User $user,
        public array $assignments,
        public bool $active,
        public bool $canManage,
    ) {}
}
