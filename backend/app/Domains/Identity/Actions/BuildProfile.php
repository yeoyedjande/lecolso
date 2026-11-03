<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Authorization\Authorizer;
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
    public function __construct(private Authorizer $authorizer) {}

    public function handle(User $user): Profile
    {
        $assignments = RoleAssignment::ofUser($user)->orderBy('created_at')->get()->groupBy('school_id');

        $schools = School::query()
            ->whereIn('id', $assignments->keys()->all())
            ->orderBy('name')
            ->get();

        $memberships = [];
        foreach ($schools as $school) {
            $memberships[] = new SchoolMembership(
                school: $school,
                assignments: array_values($assignments->get($school->id)?->all() ?? []),
                permissions: $this->authorizer->permissionsFor($user, $school),
            );
        }

        return new Profile($user, $memberships);
    }
}
