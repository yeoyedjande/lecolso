<?php

declare(strict_types=1);

use App\Domains\Identity\Http\Middleware\EnsurePasswordChanged;
use App\Domains\Tenancy\Http\Middleware\EnsureSuperAdmin;
use App\Domains\Tenancy\Http\Middleware\ResolveSchool;
use App\Support\Routing\DomainRoutes;
use App\Support\Tenancy\ClearTenantContext;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        commands: __DIR__.'/../routes/console.php',
        // Routes de l'API : un fichier routes.php par domaine, chargé sous /api/v1
        then: static function (): void {
            DomainRoutes::register();
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Derrière le proxy Railway (TLS terminé en amont, IP variables) : en-têtes X-Forwarded-* de confiance,
        // pour le schéma https, l'hôte et l'IP réelle (limites de débit par IP)
        $middleware->trustProxies(at: '*');

        // Authentification SPA par cookie httpOnly : session + CSRF pour les requêtes du frontend (SANCTUM_STATEFUL_DOMAINS)
        $middleware->statefulApi();

        $middleware->api(
            // Contexte tenant (app.user_id, app.school_id) remis à zéro à la fin de chaque requête
            prepend: [ClearTenantContext::class],
            // Mot de passe provisoire : toutes les routes refusées sauf /me, /auth/password et /auth/logout
            append: [EnsurePasswordChanged::class],
        );

        // L'école doit être résolue avant la liaison des modèles de route ({cycle}, {user}) : sous la RLS,
        // un modèle d'une autre école est alors introuvable (404)
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: ResolveSchool::class);

        $middleware->alias([
            // Routes d'un établissement : après auth:sanctum
            'school' => ResolveSchool::class,
            // Routes /api/v1/platform/* : après auth:sanctum
            'super_admin' => EnsureSuperAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API uniquement : toutes les erreurs sont rendues en JSON
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request): bool => true,
        );
    })->create();
