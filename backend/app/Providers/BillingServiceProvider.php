<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domains\Billing\Listeners\UpdateInvoicePayer;
use App\Domains\Billing\Models\FeeType;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\InvoiceLine;
use App\Domains\Billing\Policies\InvoicePolicy;
use App\Domains\Students\Events\StudentPayerChanged;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/** Facturation : paramètres de route (sous la RLS de l'école courante), Policy, réaction aux changements de payeur. */
final class BillingServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::model('invoice', Invoice::class);
        Route::model('feeType', FeeType::class);
        Route::model('line', InvoiceLine::class);

        Gate::policy(Invoice::class, InvoicePolicy::class);

        Event::listen(StudentPayerChanged::class, UpdateInvoicePayer::class);
    }
}
