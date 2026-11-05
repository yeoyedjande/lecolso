<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Mouvement d'une caisse : `kind` payment (encaissement), cancellation (annulation d'un paiement) ou refund
 * (remboursement). Montant signé en FCFA : négatif pour une annulation ou un remboursement. `number` : numéro du reçu
 * (REC-…) ou du remboursement (RMB-…). `cancelled` : encaissement annulé depuis.
 *
 * @property-read array{kind: string, at: string, number: string, amount: int, method: string, student_name: string, payment_id: string|null, reason: string|null, cancelled: bool} $resource
 */
final class CashMovementResource extends JsonResource
{
    /**
     * @return array{kind: string, at: string, number: string, amount: int, method: string, student_name: string, payment_id: string|null, reason: string|null, cancelled: bool}
     */
    public function toArray(Request $request): array
    {
        $row = $this->resource;

        return [
            'kind' => (string) $row['kind'],
            'at' => (string) $row['at'],
            'number' => (string) $row['number'],
            'amount' => (int) $row['amount'],
            'method' => (string) $row['method'],
            'student_name' => (string) $row['student_name'],
            'payment_id' => is_string($row['payment_id']) ? $row['payment_id'] : null,
            'reason' => is_string($row['reason']) ? $row['reason'] : null,
            'cancelled' => (bool) $row['cancelled'],
        ];
    }
}
