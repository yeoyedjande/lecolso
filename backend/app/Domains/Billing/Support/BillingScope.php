<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Authorization\RoleCatalog;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Support\Tenancy\TenantContext;

/**
 * Cycles où l'utilisateur a une permission de facturation **au titre du personnel** : null = toute l'école, [] = aucun.
 * Sert à la grille, au calendrier, aux échéanciers et à la génération des factures, qui portent sur toute une école ou
 * tout un cycle. Les rôles Parent et Enseignant n'y donnent rien : un parent ne voit que les factures de ses enfants
 * (InvoicePolicy, StudentAccess), jamais les montants des autres familles.
 */
final readonly class BillingScope
{
    private const array EXCLUDED_ROLES = [Role::Guardian->value, Role::Teacher->value];

    public function __construct(
        private Authorizer $authorizer,
        private RoleCatalog $catalog,
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

        $roles = $this->catalog->rolesOf($schoolId);
        $cycles = [];

        foreach ($this->authorizer->assignments($user, $schoolId) as $assignment) {
            /** @var RoleAssignment $assignment */
            if (in_array($assignment->role, self::EXCLUDED_ROLES, true) || ($roles[$assignment->role] ?? null)?->grants($permission) !== true) {
                continue;
            }
            if ($assignment->cycle_id === null) {
                return null;
            }
            $cycles[$assignment->cycle_id] = $assignment->cycle_id;
        }

        return array_values($cycles);
    }

    public function allows(User $user, string $permission, string $cycleId): bool
    {
        $cycles = $this->cycles($user, $permission);

        return $cycles === null || in_array($cycleId, $cycles, true);
    }
}
