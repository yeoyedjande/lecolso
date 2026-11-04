<?php

declare(strict_types=1);

namespace App\Domains\Identity\Auth;

use App\Domains\Identity\Models\User;
use App\Support\Phone\Phone;
use App\Support\Tenancy\TenantContext;
use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Hashing\Hasher;
use Illuminate\Database\DatabaseManager;
use Illuminate\Support\Str;

/**
 * Fournisseur d'utilisateurs compatible avec la RLS de users.
 *
 * Avant de charger un utilisateur (session, cookie « se souvenir de moi » ou identifiant de connexion),
 * il pose app.user_id : sans cela, la RLS ne laisse voir aucun utilisateur. La recherche par identifiant passe
 * par la fonction SECURITY DEFINER auth_user_id(), qui ne renvoie qu'un identifiant.
 */
final class RlsUserProvider extends EloquentUserProvider
{
    public function __construct(
        Hasher $hasher,
        private readonly TenantContext $context,
        private readonly DatabaseManager $db,
    ) {
        parent::__construct($hasher, User::class);
    }

    /** Identifiant saisi (téléphone ou e-mail) → forme stockée, ou null s'il est inexploitable. */
    public static function normalizeLogin(string $login): ?string
    {
        $login = trim($login);

        if (str_contains($login, '@')) {
            return Str::lower($login);
        }

        return Phone::normalize($login);
    }

    /** Identifiant de l'utilisateur correspondant à un téléphone ou un e-mail, sans révéler autre chose. */
    public function idForLogin(string $login): ?string
    {
        $normalized = self::normalizeLogin($login);

        if ($normalized === null) {
            return null;
        }

        $id = $this->db->connection(TenantContext::CONNECTION)->scalar('select auth_user_id(?)', [$normalized]);

        return is_string($id) ? $id : null;
    }

    public function retrieveById($identifier): ?User
    {
        if (! is_string($identifier) || ! Str::isUuid($identifier)) {
            return null;
        }

        $this->context->setUser($identifier);

        return User::query()->find($identifier);
    }

    public function retrieveByToken($identifier, #[\SensitiveParameter] $token): ?User
    {
        $user = $this->retrieveById($identifier);

        if ($user === null) {
            return null;
        }

        $rememberToken = $user->getRememberToken();

        return is_string($rememberToken) && $rememberToken !== '' && hash_equals($rememberToken, $token) ? $user : null;
    }

    /**
     * @param  array<string, mixed>  $credentials  clé « login » : téléphone ou e-mail
     */
    public function retrieveByCredentials(#[\SensitiveParameter] array $credentials): ?User
    {
        $login = $credentials['login'] ?? null;

        if (! is_string($login)) {
            return null;
        }

        $id = $this->idForLogin($login);

        return $id === null ? null : $this->retrieveById($id);
    }

    public function updateRememberToken(Authenticatable $user, #[\SensitiveParameter] $token): void
    {
        if ($user instanceof User) {
            // Écriture sur sa propre ligne : autorisée par la RLS (id = app.user_id)
            $this->context->setUser($user->id);
        }

        parent::updateRememberToken($user, $token);
    }
}
