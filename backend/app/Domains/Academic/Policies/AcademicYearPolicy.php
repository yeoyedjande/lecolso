<?php

declare(strict_types=1);

namespace App\Domains\Academic\Policies;

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Models\User;
use App\Support\Tenancy\TenantContext;

/** Années scolaires de l'école courante : visibles de tout membre, gérées par la direction de toute l'école. */
final readonly class AcademicYearPolicy
{
    public function __construct(
        private Authorizer $authorizer,
        private TenantContext $context,
    ) {}

    public function viewAny(User $user): bool
    {
        return $this->context->schoolId() !== null;
    }

    public function manage(User $user): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && $this->authorizer->allows($user, 'school.settings.manage', $schoolId);
    }
}
