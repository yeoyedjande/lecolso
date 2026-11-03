<?php

declare(strict_types=1);

use App\Domains\Tenancy\Http\Middleware\EnsureSuperAdmin;
use App\Domains\Tenancy\Http\Middleware\ResolveSchool;
use App\Support\Routing\DomainRoutes;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        commands: __DIR__.'/../routes/console.php',
        // Routes de l'API : un fichier routes.php par domaine, chargé sous /api/v1
        then: static function (): void {
            DomainRoutes::register();
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
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
