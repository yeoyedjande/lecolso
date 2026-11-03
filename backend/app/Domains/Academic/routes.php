<?php

declare(strict_types=1);

// Routes du domaine Academic, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Academic\Http\Controllers\CycleController;
use Illuminate\Support\Facades\Route;

// Routes d'un établissement (en-tête X-School-Id)
Route::middleware(['auth:sanctum', 'school'])->group(static function (): void {
    Route::get('cycles', [CycleController::class, 'index'])->name('cycles.index');
    Route::patch('cycles/{cycle}', [CycleController::class, 'update'])->name('cycles.update');
});
