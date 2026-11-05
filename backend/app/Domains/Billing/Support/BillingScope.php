<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Models\User;
use App\Support\Tenancy\TenantContext;

/**
 * Cycles où l'utilisateur a une permission de facturation : null = toute l'école, [] = aucun.
 * Sert à la grille, au calendrier, aux échéanciers et à la génération des factures.
 */
final readonly class BillingScope
{
    public function __construct(
        private Authorizer $authorizer,
        private TenantContext $context,
    ) {}

    /**
     * @return list<string>|null
     */
    public function cycles(User $user, string $permission): ?array
    {
        $schoolId = $this->context->schoolId();
        if ($schoolId === null) {
            return [];
        }

        $permissions = $this->authorizer->permissionsFor($user, $schoolId);

        return array_key_exists($permission, $permissions) ? $permissions[$permission] : [];
    }

    public function allows(User $user, string $permission, string $cycleId): bool
    {
        $cycles = $this->cycles($user, $permission);

        return $cycles === null || in_array($cycleId, $cycles, true);
    }
}
