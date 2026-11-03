<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\AttemptLogin;
use App\Domains\Identity\Actions\BuildProfile;
use App\Domains\Identity\Actions\ChangePassword;
use App\Domains\Identity\Actions\Logout;
use App\Domains\Identity\Http\Requests\ChangePasswordRequest;
use App\Domains\Identity\Http\Requests\LoginRequest;
use App\Domains\Identity\Http\Resources\ProfileResource;
use App\Domains\Identity\Models\User;
use Dedoc\Scramble\Attributes\Response as ScrambleResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

final class AuthController
{
    /**
     * Connexion.
     *
     * Identifiant (téléphone ou e-mail) et mot de passe. Session par cookie httpOnly : appeler d'abord
     * GET /sanctum/csrf-cookie. Même réponse 422 que le compte existe ou non ; 429 après 5 tentatives par minute
     * pour un identifiant, ou 20 par minute depuis une adresse IP.
     *
     * @unauthenticated
     */
    #[ScrambleResponse(429, 'Trop de tentatives (par identifiant ou par adresse IP).', type: 'array{message: string, code: string}')]
    public function login(LoginRequest $request, AttemptLogin $attemptLogin, BuildProfile $buildProfile): ProfileResource
    {
        $user = $attemptLogin->handle(
            $request->login(),
            $request->password(),
            $request->boolean('remember'),
            $request->hasSession() ? $request->session() : throw new BadRequestHttpException('Requête sans session : utiliser le frontend (cookie).'),
        );

        return new ProfileResource($buildProfile->handle($user));
    }

    /**
     * Déconnexion.
     *
     * Invalide la session et renouvelle le jeton CSRF.
     */
    public function logout(Request $request, Logout $logout): Response
    {
        $logout->handle($request->session());

        return response()->noContent();
    }

    /**
     * Profil de l'utilisateur connecté.
     *
     * Ses écoles, ses rôles (par cycle) et ses permissions par école (null = toute l'école, sinon les cycles).
     */
    public function me(Request $request, BuildProfile $buildProfile): ProfileResource
    {
        return new ProfileResource($buildProfile->handle($this->user($request)));
    }

    /**
     * Changer son mot de passe.
     *
     * Obligatoire à la première connexion avec un mot de passe provisoire. 8 caractères minimum.
     */
    public function changePassword(ChangePasswordRequest $request, ChangePassword $changePassword): JsonResponse
    {
        $changePassword->handle($this->user($request), $request->newPassword(), $request->session());

        return new JsonResponse(null, 204);
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        if (! $user instanceof User) {
            throw new AuthenticationException;
        }

        return $user;
    }
}
