<?php

declare(strict_types=1);

namespace App\Domains\Billing\Listeners;

use App\Domains\Billing\Enums\DeparturePolicy;
use App\Domains\Billing\Enums\LineKind;
use App\Domains\Billing\Models\Installment;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\InvoiceLine;
use App\Domains\Billing\Support\Amount;
use App\Domains\Billing\Support\FinancialPolicy;
use App\Domains\Billing\Support\InvoiceSchedule;
use App\Domains\Students\Events\StudentLeft;
use App\Domains\Students\Events\StudentReturned;
use App\Support\Tenancy\TenantContext;

/**
 * Départ d'un élève (décision du 05/11/2026, politique par défaut de l'école) : les échéances des périodes déjà
 * commencées à la date effective du départ restent dues ; celles des périodes non commencées (échéance après le
 * départ) sont annulées par une ligne « Départ » négative, motivée et journalisée. Les paiements ne changent pas :
 * un éventuel trop-perçu apparaît comme crédit, à rembourser ou reporter après validation de la direction.
 * Retour de l'élève : la ligne est retirée. Synchrone, dans la transaction qui modifie l'inscription.
 */
final readonly class ApplyDeparture
{
    public function __construct(private TenantContext $context) {}

    public function left(StudentLeft $event): void
    {
        $invoice = $this->clear($event->enrollmentId);
        if ($invoice === null || FinancialPolicy::departure($this->context->school()) === DeparturePolicy::KeepAll) {
            return;
        }

        $enrollment = $invoice->enrollment;
        $leftOn = $enrollment->left_on;
        if ($leftOn === null) {
            return;
        }

        // Montant net encore attendu par date (frais, lignes manuelles, remises), après la date du départ
        $shares = Installment::query()->where('invoice_id', $invoice->id)
            ->where('due_on', '>', $leftOn->toDateString())
            ->selectRaw('due_on, min(label) as label, sum(amount) as amount')
            ->groupBy('due_on')
            ->orderBy('due_on')
            ->get()
            ->map(static fn (Installment $row): array => [
                'due_on' => $row->due_on->toDateString(),
                'label' => $row->label,
                'amount' => -Amount::of($row->getAttribute('amount')),
            ])
            ->filter(static fn (array $share): bool => $share['amount'] < 0)
            ->all();
        $shares = array_values($shares);

        if ($shares === []) {
            return;
        }

        $reason = 'Départ le '.$leftOn->format('d/m/Y').($enrollment->leave_reason !== null ? ' : '.$enrollment->leave_reason : '');
        InvoiceSchedule::addLine($invoice, [
            'kind' => LineKind::Departure,
            'label' => 'Départ : échéances non commencées annulées',
            'reason' => mb_substr($reason, 0, 200),
            'created_by' => $this->context->userId(),
        ], $shares);
    }

    public function returned(StudentReturned $event): void
    {
        $this->clear($event->enrollmentId);
    }

    /** Retire la ligne de départ existante (nouvelle date, ou retour) ; renvoie la facture verrouillée. */
    private function clear(string $enrollmentId): ?Invoice
    {
        $invoice = Invoice::query()->where('enrollment_id', $enrollmentId)->lockForUpdate()->first();
        if ($invoice === null) {
            return null;
        }

        $lines = InvoiceLine::query()->where('invoice_id', $invoice->id)->where('kind', LineKind::Departure)->get();
        if ($lines->isNotEmpty()) {
            $lines->each(static fn (InvoiceLine $line): ?bool => $line->delete());
            InvoiceSchedule::rebalanceDiscounts($invoice);
        }

        return $invoice;
    }
}
