<?php

declare(strict_types=1);

namespace App\Domains\Identity\Data;

/** Une affectation d'un compte dans l'école courante (écran Utilisateurs) : son identifiant sert à la retirer. */
final readonly class UserAssignment
{
    public function __construct(
        public string $id,
        public string $role,
        public ?string $roleName,
        public ?string $cycleId,
    ) {}
}
