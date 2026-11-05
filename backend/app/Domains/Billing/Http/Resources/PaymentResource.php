<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Paiement encaissé (FCFA) et son reçu. `cancellation` : annulation (motif, date, auteur), sinon null ; un paiement
 * annulé reste affiché, son numéro n'est jamais réutilisé.
 *
 * @property-read Payment $resource
 */
final class PaymentResource extends JsonResource
{
    /**
     * @return array{id: string, receipt_number: string, paid_at: string, amount: int, method: string, reference: string|null, payer_name: string, cashier_name: string, cancellation: array{reason: string, cancelled_at: string, cancelled_by_name: string}|null}
     */
    public function toArray(Request $request): array
    {
        $payment = $this->resource;
        $cancellation = $payment->cancellation;

        return [
            'id' => $payment->id,
            'receipt_number' => $payment->receipt_number,
            'paid_at' => $payment->paid_at->toIso8601String(),
            'amount' => (int) $payment->amount,
            'method' => $payment->method->value,
            'reference' => $payment->reference,
            'payer_name' => $payment->payer_name,
            'cashier_name' => $payment->cashier_name,
            'cancellation' => $cancellation === null ? null : [
                'reason' => $cancellation->reason,
                'cancelled_at' => $cancellation->created_at->toIso8601String(),
                'cancelled_by_name' => $cancellation->cancelled_by_name,
            ],
        ];
    }
}
