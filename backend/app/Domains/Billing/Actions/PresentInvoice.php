<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Data\InvoiceView;
use App\Domains\Billing\Models\FeeSchedule;
use App\Domains\Billing\Models\FeeType;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Support\Amount;
use App\Domains\Identity\Models\User;

/** Facture avec ses lignes et échéances, les services optionnels ajoutables (montant fixé dans la grille), les droits. */
final class PresentInvoice
{
    public function handle(User $user, Invoice $invoice): InvoiceView
    {
        $invoice->load(['lines.feeType', 'installments', 'payer', 'academicYear', 'enrollment.classroom.level.cycle']);
        $present = $invoice->lines->pluck('fee_type_id')->filter()->all();
        $amounts = Amount::byFeeType(FeeSchedule::query()
            ->where('academic_year_id', $invoice->academic_year_id)
            ->where('level_id', $invoice->enrollment->classroom->level_id)
            ->get());

        $options = FeeType::query()->where('is_optional', true)->orderBy('position')->get()
            ->filter(static fn (FeeType $type): bool => ! in_array($type->id, $present, true) && ($amounts[$type->id] ?? 0) > 0)
            ->map(static fn (FeeType $type): array => ['type' => $type, 'amount' => $amounts[$type->id] ?? 0])
            ->values();

        return new InvoiceView($invoice, $options, $user->can('manage', $invoice), $user->can('discount', $invoice));
    }
}
