<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Authorization\RoleCatalog;
use App\Domains\Identity\Data\EffectiveRole;
use App\Domains\Identity\Data\SchoolUser;
use App\Domains\Identity\Data\UserAssignment;
use App\Domains\Identity\Models\MemberDeactivation;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use Illuminate\Contracts\Auth\Access\Gate;

/** Présente des comptes de l'école courante (affectations, statut, droits de l'acteur sur chacun). */
final readonly class PresentSchoolUser
{
    public function __construct(
        private RoleCatalog $catalog,
        private Gate $gate,
    ) {}

    public function one(User $actor, School $school, User $user): SchoolUser
    {
        return $this->many($actor, $school, [$user])[0];
    }

    /**
     * @param  list<User>  $users
     * @return list<SchoolUser>
     */
    public function many(User $actor, School $school, array $users): array
    {
        $ids = array_map(static fn (User $user): string => $user->id, $users);
        $assignments = RoleAssignment::query()->whereIn('user_id', $ids)->orderBy('created_at')->get()->groupBy('user_id');
        $deactivated = MemberDeactivation::query()->whereIn('user_id', $ids)->pluck('user_id')->all();
        $roles = $this->catalog->rolesOf($school);
        $gate = $this->gate->forUser($actor);

        return array_map(static fn (User $user): SchoolUser => new SchoolUser(
            user: $user,
            assignments: array_values(array_map(
                static fn (RoleAssignment $assignment): UserAssignment => new UserAssignment(
                    id: $assignment->id,
                    role: $assignment->role,
                    roleName: self::name($roles, $assignment->role),
                    cycleId: $assignment->cycle_id,
                ),
                $assignments->get($user->id)?->all() ?? [],
            )),
            active: ! in_array($user->id, $deactivated, true),
            canManage: $gate->allows('manage', $user),
        ), $users);
    }

    /**
     * @param  array<string, EffectiveRole>  $roles
     */
    private static function name(array $roles, string $role): ?string
    {
        return ($roles[$role] ?? null)?->name;
    }
}
