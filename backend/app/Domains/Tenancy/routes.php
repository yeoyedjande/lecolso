<?php

declare(strict_types=1);

// Routes du domaine Tenancy, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Tenancy\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

// Hors tenant et sans authentification : healthcheck Railway
Route::get('health', HealthController::class)->name('health');
