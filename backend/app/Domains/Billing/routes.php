<?php

declare(strict_types=1);

// Routes du domaine Billing, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Billing\Http\Controllers\BillingGridController;
use App\Domains\Billing\Http\Controllers\InvoiceController;
use Illuminate\Support\Facades\Route;

// Routes d'un établissement (en-tête X-School-Id)
Route::middleware(['auth:sanctum', 'school'])->group(static function (): void {
    Route::get('billing/grid', [BillingGridController::class, 'show'])->name('billing.grid.show');
    Route::put('billing/grid', [BillingGridController::class, 'update'])->name('billing.grid.update');
    Route::put('billing/calendars/{cycle}', [BillingGridController::class, 'updateCalendar'])->name('billing.calendars.update');
    Route::post('billing/invoices/generate', [BillingGridController::class, 'generate'])->name('billing.invoices.generate');
    Route::get('billing/schedules', [BillingGridController::class, 'schedules'])->name('billing.schedules.index');

    Route::get('students/{student}/invoices', [InvoiceController::class, 'index'])->name('students.invoices.index');
    Route::post('invoices/{invoice}/options', [InvoiceController::class, 'addOption'])->name('invoices.options.store');
    Route::delete('invoices/{invoice}/options/{feeType}', [InvoiceController::class, 'removeOption'])->name('invoices.options.destroy');
    Route::post('invoices/{invoice}/lines', [InvoiceController::class, 'addLine'])->name('invoices.lines.store');
    Route::post('invoices/{invoice}/discounts', [InvoiceController::class, 'addDiscount'])->name('invoices.discounts.store');
    Route::delete('invoices/{invoice}/lines/{line}', [InvoiceController::class, 'removeLine'])->name('invoices.lines.destroy');
});
