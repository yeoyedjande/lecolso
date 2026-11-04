<?php

declare(strict_types=1);

namespace App\Domains\Identity\Authorization;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use Illuminate\Contracts\Config\Repository as Config;
use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * Droits d'un utilisateur dans une école, selon ses affectations (rôle + cycle) et config/permissions.php.
 * Appelé par les Policies, jamais par les contrôleurs.
 *
 * Règle des cycles : une affectation sans cycle couvre toute l'école ; une affectation limitée à un cycle
 * ne couvre que les ressources de ce cycle. Une ressource de toute l'école ($cycle null) exige donc
 * une affectation sans cycle.
 */
final readonly class Authorizer
{
    public function __construct(private Config $config) {}

    public function allows(User $user, string $permission, School|string $school, Cycle|string|null $cycle = null): bool
    {
        $roles = $this->rolesFor($permission);
        $cycleId = $cycle instanceof Cycle ? $cycle->id : $cycle;

        return $this->assignments($user, $school)->contains(
            static fn (RoleAssignment $assignment): bool => in_array($assignment->role->value, $roles, true)
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
        $permissions = [];

        foreach ($this->matrix() as $permission => $roles) {
            $granting = $assignments->filter(
                static fn (RoleAssignment $assignment): bool => in_array($assignment->role->value, $roles, true),
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

    /**
     * @return list<string>
     */
    private function rolesFor(string $permission): array
    {
        return $this->matrix()[$permission]
            ?? throw new InvalidArgumentException("Permission inconnue : {$permission} (config/permissions.php)");
    }

    /**
     * @return array<string, list<string>>
     */
    private function matrix(): array
    {
        /** @var array<string, list<string>> $matrix */
        $matrix = $this->config->array('permissions');

        return $matrix;
    }
}
