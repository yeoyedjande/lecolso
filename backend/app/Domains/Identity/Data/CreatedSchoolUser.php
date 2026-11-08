<?php

declare(strict_types=1);

namespace App\Domains\Identity\Data;

/**
 * Compte créé ou rattaché. $provisionalPassword : mot de passe provisoire d'un nouveau compte, montré une seule
 * fois ; nul si le téléphone appartenait déjà à un compte (il garde son mot de passe).
 */
final readonly class CreatedSchoolUser
{
    public function __construct(
        public SchoolUser $user,
        public ?string $provisionalPassword,
    ) {}
}
