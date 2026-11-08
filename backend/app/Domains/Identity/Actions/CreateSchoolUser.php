<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Data\CreatedSchoolUser;
use App\Domains\Identity\Data\NewSchoolUser;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use LogicException;

/**
 * Ajoute un compte à l'école courante avec ses rôles :
 * - téléphone inconnu : nouveau compte, mot de passe provisoire (montré une seule fois, à changer à la connexion) ;
 * - téléphone d'un compte existant (autre école) : il est rattaché et garde son nom et son mot de passe ;
 * - déjà membre de l'école : 422.
 * La recherche par téléphone ou e-mail passe par auth_user_id (SECURITY DEFINER, ne renvoie qu'un identifiant).
 */
final readonly class CreateSchoolUser
{
    public function __construct(
        private AssignUserRole $assignRole,
        private PresentSchoolUser $present,
    ) {}

    public function handle(User $actor, School $school, NewSchoolUser $data): CreatedSchoolUser
    {
        [$userId, $provisional] = DB::transaction(function () use ($school, $data): array {
            $existing = self::accountId($data->phone);
            $provisional = null;

            if ($existing !== null) {
                if (RoleAssignment::query()->where('user_id', $existing)->exists()) {
                    throw ValidationException::withMessages(['phone' => 'Ce numéro appartient déjà à un compte de l’établissement.']);
                }
                $userId = $existing;
            } else {
                if ($data->email !== null && self::accountId($data->email) !== null) {
                    throw ValidationException::withMessages(['email' => 'Cette adresse e-mail est déjà utilisée par un autre compte.']);
                }

                $provisional = ResetUserPassword::generate();
                $user = new User;
                $user->forceFill([
                    'name' => $data->name,
                    'phone' => $data->phone,
                    'email' => $data->email,
                    'password' => $provisional,
                    'must_change_password' => true,
                ])->save();
                $userId = $user->id;
            }

            foreach ($data->roles as $index => $role) {
                $this->assignRole->handle($school, $userId, $role['role'], $role['cycle_id'], "roles.{$index}");
            }

            return [$userId, $provisional];
        });

        // Visible seulement maintenant qu'il est membre de l'école (RLS de users)
        $user = User::query()->find($userId) ?? throw new LogicException('Compte créé introuvable.');

        return new CreatedSchoolUser($this->present->one($actor, $school, $user), $provisional);
    }

    /** Identifiant du compte qui porte ce téléphone ou cet e-mail, quelle que soit son école. */
    public static function accountId(string $login): ?string
    {
        $id = DB::scalar('select auth_user_id(?)', [$login]);

        return is_string($id) ? $id : null;
    }
}
