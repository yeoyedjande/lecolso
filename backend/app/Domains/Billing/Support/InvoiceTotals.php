<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Billing\Models\CreditTransfer;
use App\Domains\Billing\Models\Installment;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Models\Refund;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Montants de nombreuses factures en une requête (sous-requêtes, sous la RLS de l'école) : total, échu à une date,
 * réglé (même définition que InvoiceBalance). Pour les listes (impayés) et le tableau de bord.
 */
final class InvoiceTotals
{
    /**
     * Ajoute à la requête les colonnes total_amount, due_to_date, paid_amount, refunded_amount, received_amount,
     * sent_amount (lues par self::of()).
     *
     * @param  Builder<Invoice>  $query
     * @return Builder<Invoice>
     */
    public static function select(Builder $query, Carbon $today): Builder
    {
        $sum = static fn (Builder $sub): Builder => $sub->selectRaw('coalesce(sum(amount), 0)');

        return $query->select('invoices.*')
            ->selectSub($sum(Installment::query()->whereColumn('installments.invoice_id', 'invoices.id')), 'total_amount')
            ->selectSub($sum(Installment::query()->whereColumn('installments.invoice_id', 'invoices.id')->where('due_on', '<=', $today->toDateString())), 'due_to_date')
            ->selectSub($sum(Payment::query()->whereColumn('payments.invoice_id', 'invoices.id')->whereDoesntHave('cancellation')), 'paid_amount')
            ->selectSub($sum(Refund::query()->whereColumn('refunds.invoice_id', 'invoices.id')), 'refunded_amount')
            ->selectSub($sum(CreditTransfer::query()->whereColumn('credit_transfers.to_invoice_id', 'invoices.id')), 'received_amount')
            ->selectSub($sum(CreditTransfer::query()->whereColumn('credit_transfers.from_invoice_id', 'invoices.id')), 'sent_amount');
    }

    /**
     * @return array{total: int, due_to_date: int, settled: int, overdue: int, remaining: int}
     */
    public static function of(Invoice $invoice): array
    {
        $amount = static fn (string $column): int => Amount::of($invoice->getAttribute($column));
        $total = $amount('total_amount');
        $due = $amount('due_to_date');
        $settled = $amount('paid_amount') + $amount('received_amount') - $amount('refunded_amount') - $amount('sent_amount');

        return [
            'total' => $total,
            'due_to_date' => $due,
            'settled' => $settled,
            'overdue' => max(0, $due - $settled),
            'remaining' => max(0, $total - $settled),
        ];
    }
}
