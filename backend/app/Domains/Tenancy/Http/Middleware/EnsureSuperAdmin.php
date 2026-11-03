<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Middleware;

use App\Domains\Identity\Models\User;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Routes /api/v1/platform/* : super-admin uniquement. Les autres reçoivent 404 (l'existence
 * des routes n'est pas révélée). Alias : « super_admin », à placer après auth:sanctum.
 */
final class EnsureSuperAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User) {
            throw new AuthenticationException;
        }

        if (! $user->isSuperAdmin()) {
            throw new NotFoundHttpException;
        }

        $response = $next($request);
        \assert($response instanceof Response);

        return $response;
    }
}
