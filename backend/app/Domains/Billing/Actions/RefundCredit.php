<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Enums\PaymentMethod;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\Refund;
use App\Domains\Billing\Support\CashRegister;
use App\Domains\Billing\Support\InvoiceBalance;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use App\Support\Sequences\Sequence;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Remboursement d'un trop-perçu, validé par la direction (motif obligatoire), sorti de sa caisse du jour.
 * Numéro RMB-2026-000001 pris au compteur de l'école, jamais réutilisé.
 */
final readonly class RefundCredit
{
    public function __construct(private Sequence $sequence) {}

    /**
     * @throws BusinessConflict no_credit, amount_exceeds_credit, cash_closed
     */
    public function handle(User $author, Invoice $invoice, int $amount, PaymentMethod $method, ?string $reference, string $reason, Carbon $now): Refund
    {
        return DB::transaction(function () use ($author, $invoice, $amount, $method, $reference, $reason, $now): Refund {
            $locked = Invoice::query()->whereKey($invoice->id)->lockForUpdate()->firstOrFail();
            self::assertCredit(InvoiceBalance::of($locked, $now)->credit, $amount);

            $session = CashRegister::openFor($author, $now);
            $year = (int) substr(CashRegister::businessDate($now), 0, 4);

            return Refund::query()->create([
                'invoice_id' => $locked->id,
                'cash_session_id' => $session->id,
                'number' => sprintf('RMB-%d-%06d', $year, $this->sequence->next('refund:'.$year)),
                'amount' => $amount,
                'method' => $method,
                'reference' => $method->needsReference() ? $reference : null,
                'reason' => $reason,
                'refunded_by' => $author->id,
                'refunded_by_name' => $author->name,
            ]);
        });
    }

    /**
     * @throws BusinessConflict no_credit, amount_exceeds_credit
     */
    public static function assertCredit(int $credit, int $amount): void
    {
        if ($credit <= 0) {
            throw new BusinessConflict('no_credit', 'Cette facture n’a pas de trop-perçu.');
        }
        if ($amount > $credit) {
            throw new BusinessConflict('amount_exceeds_credit', 'Le montant dépasse le trop-perçu de la facture.');
        }
    }
}
