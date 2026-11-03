<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Auth\RlsUserProvider;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\AuthManager;
use Illuminate\Contracts\Hashing\Hasher;
use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Timebox;
use Illuminate\Validation\ValidationException;

/**
 * Connexion par identifiant (téléphone ou e-mail) et mot de passe, pour tous les comptes.
 *
 * Aucune énumération : que le compte existe ou non, le même travail est fait (vérification d'un hachage,
 * factice si besoin), dans une durée minimale identique (Timebox), avec le même message d'erreur.
 * À la connexion : identifiant de session régénéré.
 */
final class AttemptLogin
{
    /** Durée minimale d'une tentative, réussie ou non (microsecondes). */
    public const int MINIMUM_DURATION = 400_000;

    public const string FAILED_MESSAGE = 'Identifiant ou mot de passe incorrect.';

    private static ?string $dummyHash = null;

    public function __construct(
        private readonly AuthManager $auth,
        private readonly Hasher $hasher,
        private readonly Timebox $timebox,
    ) {}

    /**
     * @throws ValidationException identifiant ou mot de passe incorrect (message identique dans tous les cas)
     */
    public function handle(string $login, #[\SensitiveParameter] string $password, bool $remember, Session $session): User
    {
        $provider = $this->provider();

        $user = $this->timebox->call(function () use ($provider, $login, $password): ?User {
            $candidate = $provider->retrieveByCredentials(['login' => $login]);

            // Hachage factice si le compte n'existe pas : même coût de calcul dans les deux cas
            $hash = $candidate?->getAuthPassword() ?? (self::$dummyHash ??= $this->hasher->make('compte-inexistant'));
            $valid = $this->hasher->check($password, $hash);

            return $candidate !== null && $valid ? $candidate : null;
        }, self::MINIMUM_DURATION);

        if (! $user instanceof User) {
            throw ValidationException::withMessages(['login' => self::FAILED_MESSAGE]);
        }

        $this->auth->guard('web')->login($user, $remember && $user->canBeRemembered());
        $session->regenerate();

        // Sa propre ligne : autorisé par la RLS (app.user_id posé par le fournisseur d'utilisateurs)
        $user->forceFill(['last_login_at' => now()])->saveQuietly();

        return $user;
    }

    private function provider(): RlsUserProvider
    {
        $provider = $this->auth->guard('web')->getProvider();

        if (! $provider instanceof RlsUserProvider) {
            throw new \LogicException('Le garde web doit utiliser le fournisseur d’utilisateurs « rls ».');
        }

        return $provider;
    }
}
