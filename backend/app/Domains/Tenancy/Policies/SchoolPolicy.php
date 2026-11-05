<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Policies;

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\TenantContext;

/** Identité de l'école courante (nom, coordonnées, logo). */
final readonly class SchoolPolicy
{
    public function __construct(
        private Authorizer $authorizer,
        private TenantContext $context,
    ) {}

    /** Tout membre actif de l'école la voit (en-tête, reçus) : ResolveSchool l'a déjà vérifié. */
    public function view(User $user, School $school): bool
    {
        return $this->context->schoolId() === $school->id;
    }

    /** Modifier l'identité de l'école : paramètres de l'école sur toute l'école (pas un seul cycle). */
    public function update(User $user, School $school): bool
    {
        return $this->context->schoolId() === $school->id
            && $this->authorizer->allows($user, 'school.settings.manage', $school);
    }
}
