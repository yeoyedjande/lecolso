<?php

declare(strict_types=1);

namespace App\Domains\Identity\Data;

/** Un rôle de l'école et le nombre d'affectations qui le citent (écran « Rôles et permissions »). */
final readonly class SchoolRoleSummary
{
    public function __construct(
        public EffectiveRole $role,
        public int $assignmentsCount,
    ) {}
}
