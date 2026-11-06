<?php

declare(strict_types=1);

// Routes du domaine Billing, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Billing\Http\Controllers\BillingGridController;
use App\Domains\Billing\Http\Controllers\CashDeskController;
use App\Domains\Billing\Http\Controllers\DashboardController;
use App\Domains\Billing\Http\Controllers\InvoiceController;
use App\Domains\Billing\Http\Controllers\PaymentController;
use App\Domains\Billing\Http\Controllers\PaymentWebhookController;
use App\Domains\Billing\Http\Controllers\ReceiptFileController;
use App\Domains\Billing\Http\Controllers\UnpaidController;
use Illuminate\Support\Facades\Route;

// Notifications des prestataires Mobile Money : hors établissement et sans session (l'école vient de la demande)
Route::post('webhooks/payments/{provider}', PaymentWebhookController::class)
    ->where('provider', '[a-z0-9_-]{2,30}')
    ->middleware('throttle:120,1')
    ->name('webhooks.payments');

// Reçu PDF : URL signée (relative, 10 minutes)
Route::get('files/receipts/{file}', ReceiptFileController::class)
    ->where('file', '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf')
    ->middleware('signed:relative')
    ->name('files.receipt');

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

    Route::post('invoices/{invoice}/payments', [PaymentController::class, 'store'])->name('invoices.payments.store');
    Route::post('invoices/{invoice}/refunds', [PaymentController::class, 'refund'])->name('invoices.refunds.store');
    Route::post('invoices/{invoice}/credit-transfers', [PaymentController::class, 'transfer'])->name('invoices.credit-transfers.store');
    Route::get('payments/{payment}', [PaymentController::class, 'show'])->name('payments.show');
    Route::get('payments/{payment}/receipt-pdf', [PaymentController::class, 'pdf'])->name('payments.receipt-pdf.show');
    Route::post('payments/{payment}/receipt-pdf', [PaymentController::class, 'retryPdf'])->name('payments.receipt-pdf.retry');
    Route::post('payments/{payment}/cancel', [PaymentController::class, 'cancel'])->name('payments.cancel');

    Route::get('billing/cash-desk', [CashDeskController::class, 'show'])->name('billing.cash-desk.show');
    Route::post('billing/cash-sessions/{cashSession}/close', [CashDeskController::class, 'close'])->name('billing.cash-sessions.close');
    Route::get('billing/policy', [CashDeskController::class, 'policy'])->name('billing.policy.show');
    Route::put('billing/policy', [CashDeskController::class, 'savePolicy'])->name('billing.policy.update');

    Route::get('billing/unpaid', [UnpaidController::class, 'index'])->name('billing.unpaid.index');
    Route::post('billing/reminders', [UnpaidController::class, 'remind'])->name('billing.reminders.store');
    Route::get('billing/dashboard', [DashboardController::class, 'show'])->name('billing.dashboard.show');
});
