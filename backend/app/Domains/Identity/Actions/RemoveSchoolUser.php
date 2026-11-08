<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\MemberDeactivation;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Supprime un compte de l'école courante : toutes ses affectations et sa désactivation éventuelle. Le compte lui-même
 * n'est effacé (forget_user) que s'il n'appartient plus à aucune école ; sinon il garde ses autres écoles.
 * Renvoie vrai si le compte a été effacé.
 *
 * Anonymisation au lieu de l'effacement quand le compte a un historique (reçus émis, notes saisies) : à brancher
 * dans forget_user avec les modules qui créeront cet historique (décision du 04/11/2026).
 */
final class RemoveSchoolUser
{
    public function handle(User $user): bool
    {
        return DB::transaction(static function () use ($user): bool {
            // Une à une : chaque retrait est journalisé (Auditable)
            foreach (RoleAssignment::query()->where('user_id', $user->id)->get() as $assignment) {
                $assignment->delete();
            }
            MemberDeactivation::query()->where('user_id', $user->id)->delete();

            return DB::scalar('select forget_user(?)', [$user->id]) === true;
        });
    }
}
