<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Authorization\RoleCatalog;
use App\Domains\Identity\Data\MembershipRole;
use App\Domains\Identity\Data\Profile;
use App\Domains\Identity\Data\SchoolMembership;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;

/**
 * Profil de l'utilisateur connecté (/me) : ses écoles, ses rôles par école et par cycle, ses permissions.
 * Lecture sous la RLS avec le contexte app.user_id : seules ses écoles et ses affectations sont visibles.
 */
final readonly class BuildProfile
{
    public function __construct(
        private Authorizer $authorizer,
        private RoleCatalog $catalog,
    ) {}

    public function handle(User $user): Profile
    {
        $assignments = RoleAssignment::ofUser($user)->orderBy('created_at')->get()->groupBy('school_id');

        $schools = School::query()
            ->whereIn('id', $assignments->keys()->all())
            ->orderBy('name')
            ->get();

        $memberships = [];
        foreach ($schools as $school) {
            $roles = $this->catalog->rolesOf($school);
            $memberships[] = new SchoolMembership(
                school: $school,
                assignments: array_values(array_map(
                    static fn (RoleAssignment $assignment): MembershipRole => new MembershipRole(
                        role: $assignment->role,
                        roleName: ($roles[$assignment->role] ?? null)?->name,
                        cycleId: $assignment->cycle_id,
                    ),
                    $assignments->get($school->id)?->all() ?? [],
                )),
                permissions: $this->authorizer->permissionsFor($user, $school),
            );
        }

        return new Profile($user, $memberships);
    }
}
