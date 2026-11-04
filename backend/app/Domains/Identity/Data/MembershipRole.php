<?php

declare(strict_types=1);

namespace App\Domains\Identity\Data;

/**
 * Un rôle de l'utilisateur dans une école (/me) : clé d'affectation, nom du rôle personnalisé (nul pour un rôle
 * système, traduit par l'interface) et cycle (nul = toute l'école).
 */
final readonly class MembershipRole
{
    public function __construct(
        public string $role,
        public ?string $roleName,
        public ?string $cycleId,
    ) {}
}
