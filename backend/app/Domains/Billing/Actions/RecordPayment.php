<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Enums\PaymentMethod;
use App\Domains\Billing\Events\PaymentReceived;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Support\CashRegister;
use App\Domains\Billing\Support\InvoiceBalance;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use App\Support\Sequences\Sequence;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Encaissement au guichet, dans la caisse du jour de l'utilisateur. Dans une seule transaction : facture verrouillée
 * (deux encaissements simultanés ne dépassent jamais le reste dû), session verrouillée (pas de caisse clôturée),
 * numéro de reçu pris au compteur de l'école pour l'année (REC-2026-000123, unique, rendu si la transaction échoue,
 * jamais réutilisé ensuite : un paiement ne s'efface pas).
 */
final readonly class RecordPayment
{
    public function __construct(private Sequence $sequence) {}

    /**
     * @throws BusinessConflict nothing_due, amount_exceeds, cash_closed, reference_used
     */
    public function handle(User $cashier, Invoice $invoice, int $amount, PaymentMethod $method, ?string $reference, Carbon $now): Payment
    {
        $reference = $method->needsReference() ? $reference : null;

        try {
            $payment = DB::transaction(function () use ($cashier, $invoice, $amount, $method, $reference, $now): Payment {
                $locked = Invoice::query()->whereKey($invoice->id)->lockForUpdate()->firstOrFail();
                $balance = InvoiceBalance::of($locked, $now);
                if ($balance->remaining <= 0) {
                    throw new BusinessConflict('nothing_due', 'Cette facture est entièrement réglée.');
                }
                if ($amount > $balance->remaining) {
                    throw new BusinessConflict('amount_exceeds', 'Le montant dépasse le reste à payer de la facture.');
                }
                if ($reference !== null && Payment::query()->where('method', $method)->where('reference', $reference)->exists()) {
                    throw new BusinessConflict('reference_used', 'Cette référence de paiement est déjà enregistrée.');
                }

                $session = CashRegister::openFor($cashier, $now);
                $year = (int) substr(CashRegister::businessDate($now), 0, 4);
                $number = $this->sequence->next('receipt:'.$year);

                return Payment::query()->create([
                    'invoice_id' => $locked->id,
                    'cash_session_id' => $session->id,
                    'receipt_number' => sprintf('REC-%d-%06d', $year, $number),
                    'amount' => $amount,
                    'method' => $method,
                    'reference' => $reference,
                    'payer_name' => $locked->payer->name ?? '',
                    'cashier_id' => $cashier->id,
                    'cashier_name' => $cashier->name,
                    'paid_at' => $now,
                ]);
            });
        } catch (UniqueConstraintViolationException) {
            // Même référence enregistrée au même instant par un autre guichet
            throw new BusinessConflict('reference_used', 'Cette référence de paiement est déjà enregistrée.');
        }

        PaymentReceived::dispatch($payment->school_id, $payment->id);

        return $payment;
    }

    /**
     * Paiement Mobile Money confirmé par le prestataire (aucune caisse). L'argent est déjà reçu : il est enregistré même
     * si la facture a été réglée entre-temps au guichet (le trop-perçu se rembourse ou se reporte). Une même référence
     * d'opérateur n'est enregistrée qu'une fois. À appeler dans la transaction qui verrouille la demande de paiement.
     *
     * @param  string  $payerId  compte du parent qui a payé (recopié comme auteur)
     */
    public function online(Invoice $invoice, int $amount, PaymentMethod $method, string $reference, string $payerId, string $payerName, Carbon $now): Payment
    {
        $locked = Invoice::query()->whereKey($invoice->id)->lockForUpdate()->firstOrFail();
        $existing = Payment::query()->where('method', $method)->where('reference', $reference)->first();
        if ($existing !== null) {
            return $existing;
        }
        $year = (int) substr(CashRegister::businessDate($now), 0, 4);
        $number = $this->sequence->next('receipt:'.$year);

        $payment = Payment::query()->create([
            'invoice_id' => $locked->id,
            'cash_session_id' => null,
            'receipt_number' => sprintf('REC-%d-%06d', $year, $number),
            'amount' => $amount,
            'method' => $method,
            'reference' => $reference,
            'payer_name' => $payerName,
            'cashier_id' => $payerId,
            'cashier_name' => 'Mobile Money',
            'paid_at' => $now,
        ]);
        DB::afterCommit(static fn () => PaymentReceived::dispatch($payment->school_id, $payment->id));

        return $payment;
    }
}
