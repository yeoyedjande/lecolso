<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Billing\Data\ScheduleRow;
use App\Domains\Billing\Models\Installment;
use App\Domains\Billing\Support\Amount;
use App\Domains\Billing\Support\BillingScope;
use App\Domains\Identity\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Échéancier de l'année : montant attendu et nombre de factures par date, pour les cycles que l'utilisateur voit
 * (billing.view). Élèves supprimés exclus. Les montants encaissés arrivent avec les paiements (lot 5b).
 */
final readonly class ListSchedules
{
    public function __construct(private BillingScope $scope) {}

    /**
     * @return list<ScheduleRow>
     */
    public function handle(User $user, AcademicYear $year): array
    {
        $cycles = $this->scope->cycles($user, 'billing.view');

        return array_values(Installment::query()
            ->whereHas('invoice', static fn (Builder $invoice) => $invoice
                ->where('academic_year_id', $year->id)
                ->whereHas('student')
                ->when($cycles !== null, static fn (Builder $scoped) => $scoped->whereHas(
                    'enrollment.classroom.level',
                    static fn (Builder $level) => $level->whereIn('cycle_id', $cycles ?? []),
                )))
            ->selectRaw('due_on, min(label) as label, sum(amount) as expected, count(distinct invoice_id) as invoices')
            ->groupBy('due_on')
            ->orderBy('due_on')
            ->get()
            ->map(static fn (Installment $row): ScheduleRow => new ScheduleRow(
                dueOn: $row->due_on->toDateString(),
                label: $row->label,
                expected: Amount::of($row->getAttribute('expected')),
                invoices: Amount::of($row->getAttribute('invoices')),
            ))
            ->all());
    }
}
