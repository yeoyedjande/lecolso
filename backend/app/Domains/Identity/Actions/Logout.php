<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use Illuminate\Auth\AuthManager;
use Illuminate\Contracts\Session\Session;

/** Déconnexion complète : jeton « se souvenir de moi » renouvelé, session invalidée, nouveau jeton CSRF. */
final readonly class Logout
{
    public function __construct(private AuthManager $auth) {}

    public function handle(Session $session): void
    {
        $this->auth->guard('web')->logout();
        $session->invalidate();
        $session->regenerateToken();
    }
}
