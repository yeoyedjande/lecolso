<?php

declare(strict_types=1);

// Routes du domaine Family (espace parent), chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Family\Http\Controllers\GuardianController;
use Illuminate\Support\Facades\Route;

// Routes d'un établissement (en-tête X-School-Id)
Route::middleware(['auth:sanctum', 'school'])->group(static function (): void {
    Route::get('guardian/children', [GuardianController::class, 'index'])->name('guardian.children');
    Route::get('guardian/children/{student}', [GuardianController::class, 'show'])->name('guardian.child');
    Route::post('guardian/children/{student}/planned-absences', [GuardianController::class, 'planAbsence'])->name('guardian.planned-absences');
    Route::post('guardian/children/{student}/payments', [GuardianController::class, 'pay'])->name('guardian.payments.store');
    Route::get('guardian/payment-intents/{paymentIntent}', [GuardianController::class, 'payment'])->name('guardian.payment-intents.show');
});
