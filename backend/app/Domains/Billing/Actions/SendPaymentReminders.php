<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Data\ReminderOutcome;
use App\Domains\Billing\Enums\ReminderStatus;
use App\Domains\Billing\Jobs\SendPaymentReminderSms;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\PaymentReminder;
use App\Domains\Billing\Support\InvoiceTotals;
use App\Domains\Identity\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Relance des impayés (décision du 05/11/2026) : un SMS par payeur pour ses factures en retard, au plus une fois tous
 * les 7 jours (une relance en échec ne compte pas). La relance est enregistrée puis envoyée par un job en file, après
 * la validation de la transaction.
 */
final class SendPaymentReminders
{
    public const int MIN_DAYS_BETWEEN = 7;

    /**
     * @param  Collection<int, Invoice>  $invoices  factures autorisées (billing.manage sur leur cycle)
     */
    public function handle(User $author, Collection $invoices, Carbon $now): ReminderOutcome
    {
        $withTotals = InvoiceTotals::select(Invoice::query()->whereKey($invoices->modelKeys()), $now)
            ->with('payer.guardian')
            ->get();

        $queued = $recent = $noPhone = $notOverdue = 0;
        $created = [];

        DB::transaction(function () use ($author, $withTotals, $now, &$queued, &$recent, &$noPhone, &$notOverdue, &$created): void {
            foreach ($withTotals->groupBy(static fn (Invoice $invoice): string => $invoice->payer_id ?? 'none:'.$invoice->id) as $group) {
                $first = $group->first();
                $overdueInvoices = $group->filter(static fn (Invoice $invoice): bool => InvoiceTotals::of($invoice)['overdue'] > 0);
                $phone = $first?->payer?->guardian?->phone;

                if ($overdueInvoices->isEmpty()) {
                    $notOverdue++;

                    continue;
                }
                if ($first === null || $first->payer_id === null || $phone === null) {
                    $noPhone++;

                    continue;
                }
                $alreadyReminded = PaymentReminder::query()
                    ->where('payer_id', $first->payer_id)
                    ->where('status', '<>', ReminderStatus::Failed)
                    ->where('created_at', '>', $now->copy()->subDays(self::MIN_DAYS_BETWEEN))
                    ->lockForUpdate()
                    ->exists();
                if ($alreadyReminded) {
                    $recent++;

                    continue;
                }

                $reminder = PaymentReminder::query()->create([
                    'payer_id' => $first->payer_id,
                    'invoice_ids' => $overdueInvoices->modelKeys(),
                    'phone' => $phone,
                    'overdue_amount' => $overdueInvoices->sum(static fn (Invoice $invoice): int => InvoiceTotals::of($invoice)['overdue']),
                    'status' => ReminderStatus::Queued,
                    'created_by' => $author->id,
                    'created_by_name' => $author->name,
                ]);
                $created[] = [$reminder->school_id, $reminder->id];
                $queued++;
            }
        });

        // Après la transaction : le job relit la relance validée (en local et en test, la file est synchrone et
        // remet le contexte de l'école à zéro : plus aucune requête de cette demande ne suit)
        foreach ($created as [$schoolId, $reminderId]) {
            SendPaymentReminderSms::dispatch($schoolId, $reminderId);
        }

        return new ReminderOutcome($queued, $recent, $noPhone, $notOverdue);
    }
}
