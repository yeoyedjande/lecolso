<?php

declare(strict_types=1);

namespace App\Domains\Academic\Policies;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Models\User;

final readonly class CyclePolicy
{
    public function __construct(private Authorizer $authorizer) {}

    /** Modifier un cycle (nom, paramètres) : paramètres de l'école, dans la limite des cycles de l'utilisateur. */
    public function update(User $user, Cycle $cycle): bool
    {
        return $this->authorizer->allows($user, 'school.settings.manage', $cycle->school_id, $cycle);
    }
}
