<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\MemberDeactivation;
use App\Domains\Identity\Models\User;

/**
 * Désactive (accès à l'école coupé dès la requête suivante : droits, /me, en-tête X-School-Id) ou réactive un compte
 * dans l'école courante. Ses affectations sont conservées. Idempotent.
 */
final class SetSchoolUserActive
{
    public function handle(User $actor, User $user, bool $active): void
    {
        if ($active) {
            MemberDeactivation::query()->where('user_id', $user->id)->delete();

            return;
        }

        MemberDeactivation::query()->firstOrCreate(['user_id' => $user->id], ['deactivated_by' => $actor->id]);
    }
}
