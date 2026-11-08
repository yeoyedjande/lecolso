<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domains\Billing\Contracts\PaymentGateway;
use App\Domains\Billing\Events\PaymentCancelled;
use App\Domains\Billing\Events\PaymentReceived;
use App\Domains\Billing\Gateways\FakePaymentGateway;
use App\Domains\Billing\Gateways\UnconfiguredPaymentGateway;
use App\Domains\Billing\Listeners\ApplyDeparture;
use App\Domains\Billing\Listeners\PrepareReceipt;
use App\Domains\Billing\Listeners\UpdateInvoicePayer;
use App\Domains\Billing\Models\CashSession;
use App\Domains\Billing\Models\FeeType;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\InvoiceLine;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Models\PaymentIntent;
use App\Domains\Billing\Policies\InvoicePolicy;
use App\Domains\Students\Events\StudentLeft;
use App\Domains\Students\Events\StudentPayerChanged;
use App\Domains\Students\Events\StudentReturned;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/**
 * Facturation : paramètres de route (sous la RLS de l'école courante), Policy, réaction aux changements de payeur et
 * aux départs d'élèves, reçus PDF et SMS de confirmation après un encaissement.
 */
final class BillingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Pas de prestataire Mobile Money réel en V1 : factice en local, en test et en recette, refus en production
        $this->app->singleton(PaymentGateway::class, static function (Application $app): PaymentGateway {
            if ($app->environment('production')) {
                return new UnconfiguredPaymentGateway;
            }
            $secret = config('services.payments.fake_secret');

            return new FakePaymentGateway(is_string($secret) ? $secret : '');
        });
    }

    public function boot(): void
    {
        Route::model('invoice', Invoice::class);
        Route::model('feeType', FeeType::class);
        Route::model('line', InvoiceLine::class);
        Route::model('payment', Payment::class);
        Route::model('cashSession', CashSession::class);
        Route::model('paymentIntent', PaymentIntent::class);

        Gate::policy(Invoice::class, InvoicePolicy::class);

        Event::listen(StudentPayerChanged::class, UpdateInvoicePayer::class);
        Event::listen(StudentLeft::class, [ApplyDeparture::class, 'left']);
        Event::listen(StudentReturned::class, [ApplyDeparture::class, 'returned']);
        Event::listen(PaymentReceived::class, [PrepareReceipt::class, 'received']);
        Event::listen(PaymentCancelled::class, [PrepareReceipt::class, 'cancelled']);
    }
}
