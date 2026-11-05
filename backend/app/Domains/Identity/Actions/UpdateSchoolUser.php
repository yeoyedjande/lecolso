<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;
use Illuminate\Validation\ValidationException;

/** Modifie le nom, le téléphone ou l'e-mail d'un compte de l'école (identifiants uniques entre tous les comptes). */
final class UpdateSchoolUser
{
    public function handle(User $user, ?string $name, ?string $phone, ?string $email, bool $emailGiven): User
    {
        if ($phone !== null && $phone !== $user->phone && self::takenByOther($phone, $user)) {
            throw ValidationException::withMessages(['phone' => 'Ce numéro est déjà utilisé par un autre compte.']);
        }

        if ($emailGiven && $email !== null && self::takenByOther($email, $user)) {
            throw ValidationException::withMessages(['email' => 'Cette adresse e-mail est déjà utilisée par un autre compte.']);
        }

        if ($name !== null) {
            $user->name = $name;
        }
        if ($phone !== null) {
            $user->phone = $phone;
        }
        if ($emailGiven) {
            $user->email = $email;
        }

        // Ligne d'un membre de l'école courante : autorisé par la RLS (politique manageable_users_update)
        $user->save();

        return $user;
    }

    private static function takenByOther(string $login, User $user): bool
    {
        $owner = CreateSchoolUser::accountId($login);

        return $owner !== null && $owner !== $user->id;
    }
}
