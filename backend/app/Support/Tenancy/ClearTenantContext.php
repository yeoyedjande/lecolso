<?php

declare(strict_types=1);

namespace App\Support\Tenancy;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Groupe api : remet le contexte (app.user_id, app.school_id) à zéro à la fin de chaque requête,
 * y compris sur les routes sans école (le fournisseur d'utilisateurs pose app.user_id à l'authentification).
 */
final readonly class ClearTenantContext
{
    public function __construct(private TenantContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        try {
            $response = $next($request);
            \assert($response instanceof Response);

            return $response;
        } finally {
            $this->context->clear();
        }
    }
}
