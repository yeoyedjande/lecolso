<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Billing\Enums\LineKind;
use App\Domains\Billing\Models\Installment;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\InvoiceLine;
use App\Support\Tenancy\TenantContext;

/**
 * Ligne « Départ » d'une facture : annule le net des échéances postérieures à la date de départ de l'élève (périodes
 * non commencées). Retirée puis recalculée à chaque changement de la facture d'un élève parti (ManageInvoiceLines), pour ne
 * jamais annuler une ligne qui n'existe plus ni laisser due une ligne ajoutée après le départ.
 */
final readonly class DepartureAdjustment
{
    public function __construct(private TenantContext $context) {}

    /** Retire la ligne de départ (nouvelle date, retour de l'élève, recalcul) et répartit de nouveau les remises. */
    public function clear(Invoice $invoice): bool
    {
        $lines = InvoiceLine::query()->where('invoice_id', $invoice->id)->where('kind', LineKind::Departure)->get();
        if ($lines->isEmpty()) {
            return false;
        }

        $lines->each(static fn (InvoiceLine $line): ?bool => $line->delete());
        InvoiceSchedule::rebalanceDiscounts($invoice);

        return true;
    }

    /** Ajoute la ligne de départ d'après la date de départ de l'inscription (rien si aucune échéance à annuler). */
    public function apply(Invoice $invoice): void
    {
        $enrollment = $invoice->enrollment()->firstOrFail();
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
}
