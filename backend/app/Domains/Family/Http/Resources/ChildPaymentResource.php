<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Resources;

use App\Domains\Billing\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Paiement de la facture de l'enfant (FCFA) : reçu, date, moyen ; un paiement annulé reste visible, marqué.
 *
 * @property-read Payment $resource
 */
final class ChildPaymentResource extends JsonResource
{
    /**
     * @return array{id: string, receipt_number: string, amount: int, method: string, paid_at: string, cancelled: bool}
     */
    public function toArray(Request $request): array
    {
        $payment = $this->resource;

        return [
            'id' => $payment->id,
            'receipt_number' => $payment->receipt_number,
            'amount' => (int) $payment->amount,
            'method' => $payment->method->value,
            'paid_at' => $payment->paid_at->toIso8601String(),
            'cancelled' => $payment->cancellation !== null,
        ];
    }
}
