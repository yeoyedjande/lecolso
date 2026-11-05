<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Data\CashDeskView;
use App\Domains\Billing\Models\CashSession;
use App\Domains\Billing\Support\BillingScope;
use App\Domains\Billing\Support\CashRegister;
use App\Domains\Identity\Models\User;
use Illuminate\Support\Carbon;

/**
 * Caisse du jour : sessions (une par caissier), leurs mouvements (encaissements, annulations, remboursements) et
 * totaux par moyen. Un caissier limité à un cycle ne voit que sa caisse.
 */
final readonly class ShowCashDesk
{
    public function __construct(private BillingScope $scope) {}

    public function handle(User $user, ?Carbon $day): CashDeskView
    {
        $date = $day?->toDateString() ?? CashRegister::businessDate(Carbon::now());
        $all = $this->scope->cycles($user, 'billing.manage') === null;

        $sessions = CashSession::query()
            ->where('business_date', $date)
            ->when(! $all, static fn ($query) => $query->where('cashier_id', $user->id))
            ->with([
                'payments.cancellation',
                'payments.invoice.studentRecord',
                'cancellations.payment.invoice.studentRecord',
                'refunds.invoice.studentRecord',
            ])
            ->orderBy('cashier_name')
            ->get()
            // Sa propre caisse d'abord
            ->sortBy(static fn (CashSession $session): int => $session->cashier_id === $user->id ? 0 : 1)
            ->values();

        return new CashDeskView($date, $sessions, $user->id, $all);
    }
}
