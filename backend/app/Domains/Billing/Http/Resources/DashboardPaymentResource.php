<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Encaissement récent (non annulé) : reçu, date, montant en FCFA, élève.
 *
 * @property-read array{payment_id: string, receipt_number: string, paid_at: string, amount: int, student_name: string} $resource
 */
final class DashboardPaymentResource extends JsonResource
{
    /**
     * @return array{payment_id: string, receipt_number: string, paid_at: string, amount: int, student_name: string}
     */
    public function toArray(Request $request): array
    {
        $row = $this->resource;

        return [
            'payment_id' => (string) $row['payment_id'],
            'receipt_number' => (string) $row['receipt_number'],
            'paid_at' => (string) $row['paid_at'],
            'amount' => (int) $row['amount'],
            'student_name' => (string) $row['student_name'],
        ];
    }
}
