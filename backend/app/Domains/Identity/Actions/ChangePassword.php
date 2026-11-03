<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Str;

/**
 * L'utilisateur change son propre mot de passe (obligatoire à la première connexion avec un mot de passe provisoire).
 * Le mot de passe actuel est vérifié par la requête (ChangePasswordRequest).
 */
final class ChangePassword
{
    public function handle(User $user, #[\SensitiveParameter] string $newPassword, Session $session): void
    {
        // Sa propre ligne : autorisé par la RLS ; le jeton « se souvenir de moi » est renouvelé
        $user->forceFill([
            'password' => $newPassword,
            'must_change_password' => false,
            'remember_token' => Str::random(60),
        ])->save();

        $session->regenerate();
    }
}
