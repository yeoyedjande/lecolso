<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\RoleAssignment;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Facades\DB;

/**
 * Retire une affectation. La dernière affectation d'un compte ne se retire pas (409 last_role) : sans rôle, il
 * quitterait l'école sans trace ; on le supprime (RemoveSchoolUser) ou on le désactive.
 */
final class RevokeUserRole
{
    public function handle(RoleAssignment $assignment): void
    {
        DB::transaction(static function () use ($assignment): void {
            // Verrou sur les affectations du compte (FOR UPDATE, incompatible avec COUNT) : deux retraits simultanés
            // ne peuvent pas retirer la dernière
            $locked = RoleAssignment::query()->where('user_id', $assignment->user_id)->lockForUpdate()->get(['id']);

            if ($locked->containsOneItem() || $locked->isEmpty()) {
                throw new BusinessConflict('last_role', 'C’est le dernier rôle de ce compte : supprimez ou désactivez plutôt le compte.');
            }

            $assignment->delete();
        });
    }
}
