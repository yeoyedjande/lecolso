<?php

declare(strict_types=1);

namespace App\Domains\Identity\Policies;

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Models\User;
use App\Support\Tenancy\TenantContext;

/** Rôles de l'école courante (rôles système et rôles personnalisés). */
final readonly class SchoolRolePolicy
{
    public function __construct(
        private Authorizer $authorizer,
        private TenantContext $context,
    ) {}

    /**
     * Voir les rôles et le catalogue des permissions : qui gère les rôles, ou qui voit les utilisateurs
     * (pour attribuer un rôle), même limité à un cycle.
     */
    public function viewAny(User $user): bool
    {
        $schoolId = $this->context->schoolId();

        if ($schoolId === null) {
            return false;
        }

        $permissions = $this->authorizer->permissionsFor($user, $schoolId);

        return array_key_exists('roles.manage', $permissions) || array_key_exists('users.view', $permissions);
    }

    /** Créer, modifier, supprimer un rôle : roles.manage sur toute l'école (un rôle vaut pour toute l'école). */
    public function manage(User $user): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && $this->authorizer->allows($user, 'roles.manage', $schoolId);
    }
}
