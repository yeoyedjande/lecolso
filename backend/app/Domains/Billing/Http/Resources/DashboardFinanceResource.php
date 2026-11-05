<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Finances du tableau de bord (FCFA) : encaissé net et nombre d'encaissements du mois, attendu du mois, retard total,
 * taux de recouvrement (%), encaissements par mois depuis la rentrée, derniers encaissements.
 *
 * @property-read array{collected_month: int, payments_month: int, expected_month: int, overdue: int, collection_rate: int, monthly: list<array{month: string, collected: int}>, recent_payments: list<array{payment_id: string, receipt_number: string, paid_at: string, amount: int, student_name: string}>} $resource
 */
final class DashboardFinanceResource extends JsonResource
{
    /**
     * @return array{collected_month: int, payments_month: int, expected_month: int, overdue: int, collection_rate: int, monthly: list<array{month: string, collected: int}>, recent_payments: list<array{payment_id: string, receipt_number: string, paid_at: string, amount: int, student_name: string}>}
     */
    public function toArray(Request $request): array
    {
        $data = $this->resource;

        return [
            'collected_month' => (int) $data['collected_month'],
            'payments_month' => (int) $data['payments_month'],
            'expected_month' => (int) $data['expected_month'],
            'overdue' => (int) $data['overdue'],
            'collection_rate' => (int) $data['collection_rate'],
            'monthly' => array_map(static fn (array $row): array => ['month' => (string) $row['month'], 'collected' => (int) $row['collected']], $data['monthly']),
            'recent_payments' => array_map(static fn (array $row): array => [
                'payment_id' => (string) $row['payment_id'],
                'receipt_number' => (string) $row['receipt_number'],
                'paid_at' => (string) $row['paid_at'],
                'amount' => (int) $row['amount'],
                'student_name' => (string) $row['student_name'],
            ], $data['recent_payments']),
        ];
    }
}
