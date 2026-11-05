<?php

declare(strict_types=1);

namespace App\Domains\Identity\Data;

use App\Domains\Identity\Models\User;

/**
 * Un compte de l'école courante, ses affectations, son statut et ce que l'acteur peut en faire.
 * $id et $name : clés de tri de la liste, lues par la pagination par curseur pour construire la page suivante.
 */
final readonly class SchoolUser
{
    public string $id;

    public string $name;

    /**
     * @param  list<UserAssignment>  $assignments
     */
    public function __construct(
        public User $user,
        public array $assignments,
        public bool $active,
        public bool $canManage,
    ) {
        $this->id = $user->id;
        $this->name = $user->name;
    }
}
