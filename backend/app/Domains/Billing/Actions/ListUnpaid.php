<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Data\UnpaidRow;
use App\Domains\Billing\Models\Installment;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\PaymentReminder;
use App\Domains\Billing\Support\Amount;
use App\Domains\Billing\Support\BillingScope;
use App\Domains\Billing\Support\InvoiceTotals;
use App\Domains\Identity\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Impayés : factures (toutes années, élèves non supprimés) dont l'échu à aujourd'hui dépasse le réglé, dans les cycles
 * où l'utilisateur a billing.view au titre du personnel. Le plus gros retard d'abord.
 */
final readonly class ListUnpaid
{
    public function __construct(private BillingScope $scope) {}

    /**
     * @return list<UnpaidRow>
     */
    public function handle(User $user, Carbon $today, ?string $cycleId, ?string $classroomId): array
    {
        $cycles = $this->scope->cycles($user, 'billing.view');
        if ($cycles === []) {
            return [];
        }

        $query = Invoice::query()
            ->whereHas('student')
            ->when($cycles !== null, static fn (Builder $q) => $q->whereHas('enrollment.classroom.level', static fn (Builder $level) => $level->whereIn('cycle_id', $cycles ?? [])))
            ->when($cycleId !== null, static fn (Builder $q) => $q->whereHas('enrollment.classroom.level', static fn (Builder $level) => $level->where('cycle_id', $cycleId)))
            ->when($classroomId !== null, static fn (Builder $q) => $q->whereHas('enrollment', static fn (Builder $enrollment) => $enrollment->where('classroom_id', $classroomId)));

        $overdue = InvoiceTotals::select($query, $today)->get()
            ->filter(static fn (Invoice $invoice): bool => InvoiceTotals::of($invoice)['overdue'] > 0)
            ->values();
        if ($overdue->isEmpty()) {
            return [];
        }
        $overdue->load(['student', 'academicYear', 'enrollment.classroom.level.cycle', 'payer.guardian']);

        // Montant net par date : la plus ancienne échéance que le réglé ne couvre pas
        $dates = Installment::query()->whereIn('invoice_id', $overdue->pluck('id'))
            ->where('due_on', '<=', $today->toDateString())
            ->selectRaw('invoice_id, due_on, sum(amount) as amount')
            ->groupBy('invoice_id', 'due_on')
            ->orderBy('due_on')
            ->get()
            ->groupBy('invoice_id');

        $reminders = PaymentReminder::query()->whereIn('payer_id', $overdue->pluck('payer_id')->filter()->unique()->values())
            ->orderByDesc('created_at')
            ->get()
            ->unique('payer_id')
            ->keyBy('payer_id');

        $rows = [];
        foreach ($overdue as $invoice) {
            $totals = InvoiceTotals::of($invoice);
            $left = max(0, $totals['settled']);
            $oldest = $today->toDateString();
            foreach ($dates->get($invoice->id, collect()) as $row) {
                /** @var Installment $row */
                $amount = Amount::of($row->getAttribute('amount'));
                if ($left >= $amount) {
                    $left -= $amount;

                    continue;
                }
                $oldest = $row->due_on->toDateString();
                break;
            }

            $reminder = $invoice->payer_id === null ? null : $reminders->get($invoice->payer_id);
            $rows[] = new UnpaidRow(
                $invoice,
                $totals['overdue'],
                $totals['remaining'],
                $oldest,
                (int) Carbon::parse($oldest)->diffInDays($today->copy()->startOfDay()),
                $reminder instanceof PaymentReminder ? $reminder : null,
                $user->can('remind', $invoice),
            );
        }

        usort($rows, static fn (UnpaidRow $a, UnpaidRow $b): int => $b->overdue <=> $a->overdue ?: $b->daysLate <=> $a->daysLate);

        return $rows;
    }
}
