<?php

declare(strict_types=1);

// Routes du domaine Identity, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Identity\Http\Controllers\AuthController;
use App\Domains\Identity\Http\Controllers\ResetUserPasswordController;
use App\Domains\Identity\Http\Controllers\SchoolRoleController;
use Illuminate\Support\Facades\Route;

// Authentification SPA par cookie httpOnly (Sanctum) : GET /sanctum/csrf-cookie avant toute requête qui écrit
Route::post('auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:login')
    ->name('auth.login');

Route::middleware('auth:sanctum')->group(static function (): void {
    Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
    Route::post('auth/password', [AuthController::class, 'changePassword'])->name('auth.password');
    Route::get('me', [AuthController::class, 'me'])->name('me');
});

// Routes d'un établissement (en-tête X-School-Id)
Route::middleware(['auth:sanctum', 'school'])->group(static function (): void {
    Route::post('users/{user}/password-reset', ResetUserPasswordController::class)->name('users.password-reset');

    // Rôles de l'école : {role} = clé système (« secretary ») ou identifiant d'un rôle personnalisé
    Route::get('roles', [SchoolRoleController::class, 'index'])->name('roles.index');
    Route::post('roles', [SchoolRoleController::class, 'store'])->name('roles.store');
    Route::patch('roles/{role}', [SchoolRoleController::class, 'update'])->name('roles.update');
    Route::delete('roles/{role}', [SchoolRoleController::class, 'destroy'])->name('roles.destroy');
    Route::get('permissions', [SchoolRoleController::class, 'permissions'])->name('permissions.index');
});
