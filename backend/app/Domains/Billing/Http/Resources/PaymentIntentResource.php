<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Models\PaymentIntent;
use App\Support\Phone\Phone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Paiement Mobile Money d'un parent : état (pending, succeeded, failed, expired), montant crédité, frais et montant
 * débité, opérateur, numéro masqué, motif d'un échec, reçu une fois payé.
 *
 * @property-read PaymentIntent $resource
 */
final class PaymentIntentResource extends JsonResource
{
    /**
     * @return array{id: string, status: string, method: string, phone: string, amount: int, fee: int, charged: int, fee_payer: string, failure_reason: string|null, payment_id: string|null, receipt_number: string|null, expires_at: string, created_at: string}
     */
    public function toArray(Request $request): array
    {
        $intent = $this->resource;
        $payment = $intent->payment;

        return [
            'id' => $intent->id,
            'status' => $intent->status->value,
            'method' => $intent->method->value,
            'phone' => Phone::mask($intent->phone),
            'amount' => $intent->amount,
            'fee' => $intent->fee,
            'charged' => $intent->charged,
            'fee_payer' => $intent->fee_payer->value,
            'failure_reason' => $intent->failure_reason === null ? null : (string) $intent->failure_reason,
            'payment_id' => $intent->payment_id === null ? null : (string) $intent->payment_id,
            'receipt_number' => $payment === null ? null : (string) $payment->receipt_number,
            'expires_at' => $intent->expires_at->toIso8601String(),
            'created_at' => $intent->created_at->toIso8601String(),
        ];
    }
}
