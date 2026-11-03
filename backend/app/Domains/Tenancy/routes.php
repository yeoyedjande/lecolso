<?php

declare(strict_types=1);

// Routes du domaine Tenancy, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Tenancy\Http\Controllers\HealthController;
use App\Domains\Tenancy\Http\Controllers\Platform\ListSchoolsController;
use Illuminate\Support\Facades\Route;

// Hors tenant et sans authentification : healthcheck Railway
Route::get('health', HealthController::class)->name('health');

// Super-admin : hors tenant, connexion séparée app_platform via Platform::run()
Route::prefix('platform')
    ->middleware(['auth:sanctum', 'super_admin'])
    ->name('platform.')
    ->group(static function (): void {
        Route::get('schools', ListSchoolsController::class)->name('schools.index');
    });
