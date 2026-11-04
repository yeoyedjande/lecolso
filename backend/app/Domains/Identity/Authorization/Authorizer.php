<?php

declare(strict_types=1);

namespace App\Domains\Identity\Authorization;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Data\EffectiveRole;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use Illuminate\Support\Collection;

/**
 * Droits d'un utilisateur dans une école, selon ses affectations (rôle + cycle) et les rôles effectifs de l'école
 * (RoleCatalog : rôles système, éventuellement ajustés, et rôles personnalisés).
 * Appelé par les Policies, jamais par les contrôleurs. Une affectation à un rôle inconnu ne donne rien.
 *
 * Règle des cycles : une affectation sans cycle couvre toute l'école ; une affectation limitée à un cycle
 * ne couvre que les ressources de ce cycle. Une ressource de toute l'école ($cycle null) exige donc
 * une affectation sans cycle.
 */
final readonly class Authorizer
{
    public function __construct(private RoleCatalog $catalog) {}

    public function allows(User $user, string $permission, School|string $school, Cycle|string|null $cycle = null): bool
    {
        $this->catalog->assertKnownPermission($permission);
        $assignments = $this->assignments($user, $school);

        if ($assignments->isEmpty()) {
            return false;
        }

        $roles = $this->catalog->rolesOf($school);
        $cycleId = $cycle instanceof Cycle ? $cycle->id : $cycle;

        return $assignments->contains(
            static fn (RoleAssignment $assignment): bool => self::grants($roles, $assignment, $permission)
                && ($assignment->cycle_id === null || ($cycleId !== null && $assignment->cycle_id === $cycleId)),
        );
    }

    /**
     * Permissions de l'utilisateur dans une école : null = toute l'école, sinon liste des cycles concernés.
     *
     * @return array<string, list<string>|null>
     */
    public function permissionsFor(User $user, School|string $school): array
    {
        $assignments = $this->assignments($user, $school);

        if ($assignments->isEmpty()) {
            return [];
        }

        $roles = $this->catalog->rolesOf($school);
        $permissions = [];

        foreach ($this->catalog->permissions() as $permission) {
            $granting = $assignments->filter(
                static fn (RoleAssignment $assignment): bool => self::grants($roles, $assignment, $permission),
            );

            if ($granting->isEmpty()) {
                continue;
            }

            $permissions[$permission] = $granting->contains(static fn (RoleAssignment $a): bool => $a->cycle_id === null)
                ? null
                : self::cycleIds($granting);
        }

        return $permissions;
    }

    /**
     * Cycles que l'utilisateur peut voir dans l'école : null = tous (affectation sans cycle), sinon ses cycles.
     *
     * @return list<string>|null
     */
    public function cycleScope(User $user, School|string $school): ?array
    {
        $assignments = $this->assignments($user, $school);

        if ($assignments->contains(static fn (RoleAssignment $a): bool => $a->cycle_id === null)) {
            return null;
        }

        return self::cycleIds($assignments);
    }

    /**
     * @param  array<string, EffectiveRole>  $roles
     */
    private static function grants(array $roles, RoleAssignment $assignment, string $permission): bool
    {
        return ($roles[$assignment->role] ?? null)?->grants($permission) === true;
    }

    /**
     * Cycles distincts et triés d'un ensemble d'affectations limitées à un cycle.
     *
     * @param  Collection<int, RoleAssignment>  $assignments
     * @return list<string>
     */
    private static function cycleIds(Collection $assignments): array
    {
        $ids = [];
        foreach ($assignments as $assignment) {
            if ($assignment->cycle_id !== null) {
                $ids[$assignment->cycle_id] = $assignment->cycle_id;
            }
        }
        sort($ids);

        return $ids;
    }

    /**
     * @return Collection<int, RoleAssignment>
     */
    public function assignments(User $user, School|string $school): Collection
    {
        $schoolId = $school instanceof School ? $school->id : $school;

        return RoleAssignment::ofUser($user)->where('school_id', $schoolId)->get();
    }
}
