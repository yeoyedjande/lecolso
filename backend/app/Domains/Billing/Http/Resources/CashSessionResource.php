<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Models\CashSession;
use App\Domains\Billing\Support\CashRegister;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Caisse d'un caissier pour un jour. Montants en FCFA. `methods` : encaissé, annulé, remboursé et net par moyen ;
 * `expected_cash` : espèces attendues (figées à la clôture) ; `difference` : compté − attendu, une fois clôturée.
 * `movements` : du plus récent au plus ancien, montant signé (annulation et remboursement négatifs).
 *
 * @property-read array{session: CashSession, mine: bool} $resource
 */
final class CashSessionResource extends JsonResource
{
    /**
     * @return array{id: string, cashier_name: string, is_mine: bool, business_date: string, closed_at: string|null, expected_cash: int, counted_cash: int|null, difference: int|null, note: string|null, net_total: int, methods: AnonymousResourceCollection<CashMethodTotalResource>, movements: AnonymousResourceCollection<CashMovementResource>}
     */
    public function toArray(Request $request): array
    {
        $session = $this->resource['session'];
        $totals = CashRegister::totals($session);
        $expected = $session->expected_cash ?? $totals['expected_cash'];

        $movements = [];
        foreach ($session->payments as $payment) {
            $movements[] = [
                'kind' => 'payment',
                'at' => $payment->paid_at->toIso8601String(),
                'number' => $payment->receipt_number,
                'amount' => (int) $payment->amount,
                'method' => $payment->method->value,
                'student_name' => $payment->invoice->studentRecord->fullName(),
                'payment_id' => $payment->id,
                'reason' => null,
                'cancelled' => $payment->cancellation !== null,
            ];
        }
        foreach ($session->cancellations as $cancellation) {
            $payment = $cancellation->payment;
            $movements[] = [
                'kind' => 'cancellation',
                'at' => $cancellation->created_at->toIso8601String(),
                'number' => $payment->receipt_number,
                'amount' => -(int) $payment->amount,
                'method' => $payment->method->value,
                'student_name' => $payment->invoice->studentRecord->fullName(),
                'payment_id' => $payment->id,
                'reason' => $cancellation->reason,
                'cancelled' => false,
            ];
        }
        foreach ($session->refunds as $refund) {
            $movements[] = [
                'kind' => 'refund',
                'at' => $refund->created_at->toIso8601String(),
                'number' => $refund->number,
                'amount' => -(int) $refund->amount,
                'method' => $refund->method->value,
                'student_name' => $refund->invoice->studentRecord->fullName(),
                'payment_id' => null,
                'reason' => $refund->reason,
                'cancelled' => false,
            ];
        }
        usort($movements, static fn (array $a, array $b): int => strcmp($b['at'], $a['at']) ?: strcmp($b['number'], $a['number']));

        return [
            'id' => $session->id,
            'cashier_name' => $session->cashier_name,
            'is_mine' => (bool) $this->resource['mine'],
            'business_date' => $session->business_date->toDateString(),
            'closed_at' => $session->closed_at?->toIso8601String(),
            'expected_cash' => (int) $expected,
            'counted_cash' => $session->counted_cash === null ? null : (int) $session->counted_cash,
            'difference' => $session->counted_cash === null ? null : (int) ($session->counted_cash - $expected),
            'note' => $session->note === null ? null : (string) $session->note,
            'net_total' => (int) $totals['net_total'],
            'methods' => CashMethodTotalResource::collection($totals['methods']),
            'movements' => CashMovementResource::collection($movements),
        ];
    }
}
