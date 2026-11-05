<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Billing\Models\CreditTransfer;
use App\Domains\Billing\Models\Installment;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Models\Refund;
use Illuminate\Support\Carbon;

/**
 * Situation d'une facture à une date. Réglé = paiements non annulés + reports reçus − remboursements − reports
 * envoyés. Le réglé s'impute aux échéances par date (aucune répartition stockée) ; au-delà du total, c'est un
 * trop-perçu (crédit), à rembourser ou à reporter après validation de la direction.
 */
final readonly class InvoiceBalance
{
    /**
     * @param  list<array{due_on: string, label: string, amount: int, settled: int}>  $schedule
     * @param  array{due_on: string, label: string, amount: int}|null  $next
     */
    public function __construct(
        public int $total,
        public int $settled,
        public int $remaining,
        public int $credit,
        public int $overdue,
        public ?array $next,
        public array $schedule,
    ) {}

    public static function of(Invoice $invoice, Carbon $today): self
    {
        $paid = Amount::of(Payment::query()->where('invoice_id', $invoice->id)->whereDoesntHave('cancellation')->sum('amount'));
        $refunded = Amount::of(Refund::query()->where('invoice_id', $invoice->id)->sum('amount'));
        $received = Amount::of(CreditTransfer::query()->where('to_invoice_id', $invoice->id)->sum('amount'));
        $sent = Amount::of(CreditTransfer::query()->where('from_invoice_id', $invoice->id)->sum('amount'));
        $settled = $paid + $received - $refunded - $sent;

        $rows = Installment::query()->where('invoice_id', $invoice->id)
            ->selectRaw('due_on, sum(amount) as amount')
            ->groupBy('due_on')
            ->orderBy('due_on')
            ->get();
        $labels = Installment::query()->where('invoice_id', $invoice->id)->where('amount', '>', 0)
            ->orderBy('due_on')->orderByDesc('amount')->get(['due_on', 'label'])
            ->mapWithKeys(static fn (Installment $row): array => [$row->due_on->toDateString() => $row->label]);

        $total = 0;
        $dueToDate = 0;
        $left = max(0, $settled);
        $next = null;
        $schedule = [];
        foreach ($rows as $row) {
            $amount = Amount::of($row->getAttribute('amount'));
            if ($amount === 0) {
                continue;
            }
            $dueOn = $row->due_on->toDateString();
            $label = is_string($labels->get($dueOn)) ? $labels->get($dueOn) : '';
            $part = max(0, min($amount, $left));
            $left -= $part;
            $total += $amount;
            if ($row->due_on->lessThanOrEqualTo($today)) {
                $dueToDate += $amount;
            }
            if ($next === null && $part < $amount) {
                $next = ['due_on' => $dueOn, 'label' => $label, 'amount' => $amount - $part];
            }
            $schedule[] = ['due_on' => $dueOn, 'label' => $label, 'amount' => $amount, 'settled' => $part];
        }

        return new self(
            total: $total,
            settled: $settled,
            remaining: max(0, $total - $settled),
            credit: max(0, $settled - $total),
            overdue: max(0, $dueToDate - $settled),
            next: $next,
            schedule: $schedule,
        );
    }
}
