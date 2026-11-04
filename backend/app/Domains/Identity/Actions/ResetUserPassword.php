<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;
use Illuminate\Support\Str;

/**
 * Le personnel de l'école (directeur, secrétaire) réinitialise le mot de passe d'un utilisateur de l'école :
 * un mot de passe provisoire est généré, à changer à la prochaine connexion. Pas de lien par e-mail en V1.
 * Droits : UserPolicy::resetPassword. Le mot de passe provisoire n'est jamais journalisé.
 */
final class ResetUserPassword
{
    /** Sans caractères ambigus (0/O, 1/l/I) : il est dicté ou recopié à la main. */
    private const string ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

    public const int LENGTH = 10;

    public function handle(User $user): string
    {
        $provisional = self::generate();

        // Ligne d'un membre de l'école courante : autorisé par la RLS (politique manageable_users_update)
        $user->forceFill([
            'password' => $provisional,
            'must_change_password' => true,
            'remember_token' => Str::random(60),
        ])->save();

        return $provisional;
    }

    public static function generate(): string
    {
        $password = '';
        $max = strlen(self::ALPHABET) - 1;

        for ($i = 0; $i < self::LENGTH; $i++) {
            $password .= self::ALPHABET[random_int(0, $max)];
        }

        return $password;
    }
}
