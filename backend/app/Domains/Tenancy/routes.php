<?php

declare(strict_types=1);

// Routes du domaine Tenancy, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Tenancy\Http\Controllers\HealthController;
use App\Domains\Tenancy\Http\Controllers\Platform\CreateSchoolController;
use App\Domains\Tenancy\Http\Controllers\Platform\ListSchoolsController;
use App\Domains\Tenancy\Http\Controllers\Public\ShowPublicSchoolController;
use App\Domains\Tenancy\Http\Controllers\SchoolLogoFileController;
use App\Domains\Tenancy\Http\Controllers\SchoolProfileController;
use Illuminate\Support\Facades\Route;

// Hors tenant et sans authentification : healthcheck Railway
Route::get('health', HealthController::class)->name('health');

// Page publique d'une école (<slug>.<domaine>) : sans authentification, informations publiques uniquement
Route::get('public/schools/{slug}', ShowPublicSchoolController::class)
    ->where('slug', '[a-z0-9-]{1,50}')
    ->middleware('throttle:60,1')
    ->name('public.schools.show');

// Logo d'une école : URL signée (relative) renvoyée par l'API, sans session (page publique comprise)
Route::get('files/school-logos/{file}', SchoolLogoFileController::class)
    ->where('file', '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp')
    ->middleware('signed:relative')
    ->name('files.school-logo');

// Identité de l'école courante (en-tête X-School-Id)
Route::middleware(['auth:sanctum', 'school'])->group(static function (): void {
    Route::get('school', [SchoolProfileController::class, 'show'])->name('school.show');
    Route::patch('school', [SchoolProfileController::class, 'update'])->name('school.update');
    Route::post('school/logo', [SchoolProfileController::class, 'uploadLogo'])->name('school.logo.store');
    Route::delete('school/logo', [SchoolProfileController::class, 'removeLogo'])->name('school.logo.destroy');
});

// Super-admin : hors tenant, connexion séparée app_platform via Platform::run()
Route::prefix('platform')
    ->middleware(['auth:sanctum', 'super_admin'])
    ->name('platform.')
    ->group(static function (): void {
        Route::get('schools', ListSchoolsController::class)->name('schools.index');
        Route::post('schools', CreateSchoolController::class)->name('schools.store');
    });
