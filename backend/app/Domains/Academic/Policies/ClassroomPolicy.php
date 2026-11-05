<?php

declare(strict_types=1);

namespace App\Domains\Academic\Policies;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Academic\Models\Level;
use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Models\User;
use App\Support\Tenancy\TenantContext;

/**
 * Classes de l'école courante. Le cycle d'une classe est celui de son niveau : la gérer exige
 * school.settings.manage sur ce cycle (ou sur toute l'école).
 */
final readonly class ClassroomPolicy
{
    /** Permissions qui donnent la liste des classes (paramètres de l'école, ou élèves), chacune sur ses cycles. */
    public const array VIEW_PERMISSIONS = ['school.settings.view', 'students.view'];

    public function __construct(
        private Authorizer $authorizer,
        private TenantContext $context,
    ) {}

    public function viewAny(User $user): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null
            && array_intersect(self::VIEW_PERMISSIONS, array_keys($this->authorizer->permissionsFor($user, $schoolId))) !== [];
    }

    /** Créer une classe de ce niveau. */
    public function create(User $user, Level $level): bool
    {
        return $this->manages($user, $level->cycle_id);
    }

    /** Modifier ou supprimer une classe (et, en cas de changement de niveau, le nouveau niveau : vérifié par la requête). */
    public function update(User $user, Classroom $classroom): bool
    {
        return $this->manages($user, $classroom->level->cycle_id);
    }

    private function manages(User $user, string $cycleId): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && $this->authorizer->allows($user, 'school.settings.manage', $schoolId, $cycleId);
    }
}
