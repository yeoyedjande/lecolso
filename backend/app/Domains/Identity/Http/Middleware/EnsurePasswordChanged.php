<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Middleware;

use App\Domains\Identity\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Mot de passe provisoire : tant qu'il n'est pas changé, seules ces routes répondent.
 * Appliqué à tout le groupe api (bootstrap/app.php) : aucune nouvelle route ne peut l'oublier.
 */
final class EnsurePasswordChanged
{
    /** @var list<string> */
    public const array ALLOWED_ROUTES = ['auth.login', 'auth.logout', 'auth.password', 'me', 'health'];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User && $user->must_change_password && ! $request->routeIs(...self::ALLOWED_ROUTES)) {
            return new JsonResponse([
                'message' => 'Vous devez changer votre mot de passe provisoire avant de continuer.',
                'code' => 'password_change_required',
            ], Response::HTTP_FORBIDDEN);
        }

        $response = $next($request);
        \assert($response instanceof Response);

        return $response;
    }
}
