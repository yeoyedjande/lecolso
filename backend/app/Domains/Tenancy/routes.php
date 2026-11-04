<?php

declare(strict_types=1);

// Routes du domaine Tenancy, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Tenancy\Http\Controllers\HealthController;
use App\Domains\Tenancy\Http\Controllers\Platform\CreateSchoolController;
use App\Domains\Tenancy\Http\Controllers\Platform\ListSchoolsController;
use App\Domains\Tenancy\Http\Controllers\Public\ShowPublicSchoolController;
use Illuminate\Support\Facades\Route;

// Hors tenant et sans authentification : healthcheck Railway
Route::get('health', HealthController::class)->name('health');

// Page publique d'une école (<slug>.<domaine>) : sans authentification, informations publiques uniquement
Route::get('public/schools/{slug}', ShowPublicSchoolController::class)
    ->where('slug', '[a-z0-9-]{1,50}')
    ->middleware('throttle:60,1')
    ->name('public.schools.show');

// Super-admin : hors tenant, connexion séparée app_platform via Platform::run()
Route::prefix('platform')
    ->middleware(['auth:sanctum', 'super_admin'])
    ->name('platform.')
    ->group(static function (): void {
        Route::get('schools', ListSchoolsController::class)->name('schools.index');
        Route::post('schools', CreateSchoolController::class)->name('schools.store');
    });
