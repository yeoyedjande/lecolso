<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Data\InvoiceView;
use App\Domains\Billing\Models\FeeSchedule;
use App\Domains\Billing\Models\FeeType;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Support\Amount;
use App\Domains\Billing\Support\InvoiceBalance;
use App\Domains\Identity\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Facture avec ses lignes, échéances et mouvements, les services optionnels ajoutables (montant fixé dans la grille),
 * la situation à ce jour et les droits.
 */
final class PresentInvoice
{
    public function handle(User $user, Invoice $invoice): InvoiceView
    {
        $invoice->load([
            'lines.feeType', 'installments', 'payer', 'academicYear', 'enrollment.classroom.level.cycle',
            'payments.cancellation', 'refunds', 'transfersOut.toInvoice.academicYear', 'transfersIn.fromInvoice.academicYear',
            // Élève de l'autre facture, même supprimé : l'historique du report reste lisible
            'transfersOut.toInvoice.studentRecord', 'transfersIn.fromInvoice.studentRecord',
        ]);
        $present = $invoice->lines->pluck('fee_type_id')->filter()->all();
        $amounts = Amount::byFeeType(FeeSchedule::query()
            ->where('academic_year_id', $invoice->academic_year_id)
            ->where('level_id', $invoice->enrollment->classroom->level_id)
            ->get());

        $options = FeeType::query()->where('is_optional', true)->orderBy('position')->get()
            ->filter(static fn (FeeType $type): bool => ! in_array($type->id, $present, true) && ($amounts[$type->id] ?? 0) > 0)
            ->map(static fn (FeeType $type): array => ['type' => $type, 'amount' => $amounts[$type->id] ?? 0])
            ->values();

        $today = Carbon::now();
        $balance = InvoiceBalance::of($invoice, $today);
        $canRefund = $user->can('refund', $invoice);

        return new InvoiceView(
            $invoice,
            $options,
            $user->can('manage', $invoice),
            $user->can('discount', $invoice),
            $balance,
            $user->can('cancel', $invoice),
            $canRefund,
            $canRefund && $balance->credit > 0 ? self::creditTargets($user, $invoice, $today) : [],
        );
    }

    /**
     * Autres factures du même payeur (ou du même élève) qui ont un reste dû, modifiables par l'utilisateur.
     *
     * @return list<array{invoice: Invoice, remaining: int}>
     */
    private static function creditTargets(User $user, Invoice $invoice, Carbon $today): array
    {
        $candidates = Invoice::query()
            ->whereKeyNot($invoice->id)
            ->where(static function (Builder $query) use ($invoice): void {
                $query->where('student_id', $invoice->student_id);
                if ($invoice->payer_id !== null) {
                    $query->orWhere('payer_id', $invoice->payer_id);
                }
            })
            ->whereHas('student')
            ->with(['student', 'academicYear'])
            ->get();

        $targets = [];
        foreach ($candidates as $target) {
            $remaining = InvoiceBalance::of($target, $today)->remaining;
            if ($remaining > 0 && $user->can('manage', $target)) {
                $targets[] = ['invoice' => $target, 'remaining' => $remaining];
            }
        }

        return $targets;
    }
}
