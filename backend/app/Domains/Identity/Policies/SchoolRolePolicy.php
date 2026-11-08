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
     * Voir les rôles et le catalogue des permissions : qui gère les rôles, ou qui voit les comptes de l'école
     * (pour attribuer un rôle, ou filtrer la liste et retrouver un compte dont on réinitialise le mot de passe),
     * même limité à un cycle. Lecture seule.
     */
    public function viewAny(User $user): bool
    {
        $schoolId = $this->context->schoolId();

        if ($schoolId === null) {
            return false;
        }

        $permissions = $this->authorizer->permissionsFor($user, $schoolId);

        return array_key_exists('roles.manage', $permissions)
            || array_intersect(UserPolicy::VIEW_PERMISSIONS, array_keys($permissions)) !== [];
    }

    /** Créer, modifier, supprimer un rôle : roles.manage sur toute l'école (un rôle vaut pour toute l'école). */
    public function manage(User $user): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && $this->authorizer->allows($user, 'roles.manage', $schoolId);
    }
}
