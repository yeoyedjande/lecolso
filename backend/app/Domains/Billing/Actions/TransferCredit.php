<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Models\CreditTransfer;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Support\InvoiceBalance;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Report d'un trop-perçu sur une autre facture du même payeur (frère ou sœur, année suivante), validé par la
 * direction (motif obligatoire). Le report ne dépasse ni le crédit de la facture d'origine ni le reste dû de l'autre.
 */
final class TransferCredit
{
    /**
     * @throws BusinessConflict other_payer, no_credit, amount_exceeds_credit, target_not_due
     */
    public function handle(User $author, Invoice $from, Invoice $to, int $amount, string $reason, Carbon $now): CreditTransfer
    {
        if (! self::samePayer($from, $to)) {
            throw new BusinessConflict('other_payer', 'Le crédit ne se reporte que sur une facture du même payeur.');
        }

        return DB::transaction(static function () use ($author, $from, $to, $amount, $reason, $now): CreditTransfer {
            // Verrou dans un ordre fixe (identifiants) : deux reports croisés ne se bloquent pas
            Invoice::query()->whereKey([$from->id, $to->id])->orderBy('id')->lockForUpdate()->get();
            RefundCredit::assertCredit(InvoiceBalance::of($from, $now)->credit, $amount);
            if ($amount > InvoiceBalance::of($to, $now)->remaining) {
                throw new BusinessConflict('target_not_due', 'Le montant dépasse le reste à payer de l’autre facture.');
            }

            return CreditTransfer::query()->create([
                'from_invoice_id' => $from->id,
                'to_invoice_id' => $to->id,
                'amount' => $amount,
                'reason' => $reason,
                'created_by' => $author->id,
                'created_by_name' => $author->name,
            ]);
        });
    }

    public static function samePayer(Invoice $from, Invoice $to): bool
    {
        return $from->id !== $to->id
            && ($from->student_id === $to->student_id || ($from->payer_id !== null && $from->payer_id === $to->payer_id));
    }
}
