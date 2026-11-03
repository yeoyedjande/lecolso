<?php

declare(strict_types=1);

namespace App\Domains\Identity\Policies;

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Support\Tenancy\TenantContext;

final readonly class UserPolicy
{
    public function __construct(
        private Authorizer $authorizer,
        private TenantContext $context,
    ) {}

    /**
     * Réinitialiser le mot de passe de $target dans l'école courante.
     *
     * - permission users.reset_password (directeur, secrétaire) ;
     * - jamais son propre compte (POST /auth/password) ni un super-admin ;
     * - $target doit avoir une affectation dans l'école courante, et chacune de ses affectations doit être
     *   couverte par les cycles de l'acteur (un rôle limité à la maternelle ne touche pas un compte du primaire
     *   ni un compte de toute l'école).
     */
    public function resetPassword(User $actor, User $target): bool
    {
        $schoolId = $this->context->schoolId();

        if ($schoolId === null || $actor->id === $target->id || $target->isSuperAdmin()) {
            return false;
        }

        $targetAssignments = RoleAssignment::query()->where('user_id', $target->id)->get();

        if ($targetAssignments->isEmpty()) {
            return false;
        }

        return $targetAssignments->every(fn (RoleAssignment $assignment): bool => $this->authorizer->allows(
            $actor,
            'users.reset_password',
            $schoolId,
            $assignment->cycle_id,
        ));
    }
}
