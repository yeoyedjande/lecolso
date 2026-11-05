<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Models\PaymentCancellation;
use App\Domains\Billing\Support\CashRegister;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Annulation d'un paiement (direction, motif obligatoire). Le paiement et son reçu restent, marqués annulés ; le
 * numéro n'est jamais réutilisé. L'annulation est comptée dans la caisse du paiement si elle est encore ouverte (la
 * caisse du jour reste juste), sinon dans la caisse du jour de l'auteur (une caisse clôturée ne change plus).
 */
final class CancelPayment
{
    /**
     * @throws BusinessConflict already_cancelled, cash_closed
     */
    public function handle(User $author, Payment $payment, string $reason, Carbon $now): Payment
    {
        return DB::transaction(static function () use ($author, $payment, $reason, $now): Payment {
            Invoice::query()->whereKey($payment->invoice_id)->lockForUpdate()->firstOrFail();
            if (PaymentCancellation::query()->where('payment_id', $payment->id)->exists()) {
                throw new BusinessConflict('already_cancelled', 'Ce paiement est déjà annulé.');
            }

            $original = CashRegister::lock($payment->cashSession);
            $session = $original->isClosed() ? CashRegister::openFor($author, $now) : $original;

            PaymentCancellation::query()->create([
                'payment_id' => $payment->id,
                'cash_session_id' => $session->id,
                'reason' => $reason,
                'cancelled_by' => $author->id,
                'cancelled_by_name' => $author->name,
            ]);

            return $payment->load('cancellation');
        });
    }
}
