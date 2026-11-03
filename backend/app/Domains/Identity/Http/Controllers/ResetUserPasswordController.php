<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\ResetUserPassword;
use App\Domains\Identity\Http\Requests\ResetUserPasswordRequest;
use Illuminate\Http\JsonResponse;

final class ResetUserPasswordController
{
    /**
     * Réinitialiser le mot de passe d'un utilisateur de l'école.
     *
     * Directeur ou secrétaire de l'école (dans la limite de leurs cycles). Génère un mot de passe provisoire,
     * renvoyé une seule fois, à changer à la prochaine connexion. 404 si l'utilisateur n'est pas membre de l'école.
     */
    public function __invoke(ResetUserPasswordRequest $request, ResetUserPassword $resetUserPassword): JsonResponse
    {
        return new JsonResponse([
            'provisional_password' => $resetUserPassword->handle($request->target()),
        ]);
    }
}
