<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Data\InvoiceView;
use App\Domains\Billing\Enums\LineKind;
use App\Domains\Billing\Models\CreditTransfer;
use App\Domains\Billing\Models\InvoiceLine;
use App\Domains\Billing\Support\Amount;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Facture d'un élève pour une année. Montants en FCFA (entiers) ; une remise ou un départ est négatif. `schedule` :
 * montant dû par date (toutes lignes confondues) et sa part réglée (paiements imputés par date). `balance` : réglé
 * (paiements non annulés + reports reçus − remboursements − reports envoyés), reste, retard, trop-perçu (`credit`),
 * prochaine échéance. `credit_targets` : autres factures du même payeur où reporter le trop-perçu (direction).
 *
 * @property-read InvoiceView $resource
 */
final class InvoiceResource extends JsonResource
{
    /**
     * @return array{id: string, academic_year: array{id: string, label: string, is_current: bool}, classroom_name: string, payer: array{name: string}|null, left_on: string|null, total: int, discount_total: int, balance: array{settled: int, remaining: int, overdue: int, credit: int, next: array{due_on: string, label: string, amount: int}|null}, lines: AnonymousResourceCollection<InvoiceLineResource>, schedule: list<array{due_on: string, label: string, amount: int, settled: int}>, payments: AnonymousResourceCollection<PaymentResource>, refunds: AnonymousResourceCollection<RefundResource>, transfers: AnonymousResourceCollection<CreditTransferResource>, credit_targets: AnonymousResourceCollection<CreditTargetResource>, available_options: AnonymousResourceCollection<InvoiceOptionResource>, can_manage: bool, can_collect: bool, can_discount: bool, can_cancel: bool, can_refund: bool}
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;
        $invoice = $view->invoice;
        $balance = $view->balance;

        $transfers = $invoice->transfersOut->map(static fn (CreditTransfer $transfer): array => ['transfer' => $transfer, 'direction' => 'out'])
            ->concat($invoice->transfersIn->map(static fn (CreditTransfer $transfer): array => ['transfer' => $transfer, 'direction' => 'in']))
            ->sortByDesc(static fn (array $row): string => $row['transfer']->created_at->toIso8601String())
            ->values();

        return [
            'id' => $invoice->id,
            'academic_year' => [
                'id' => $invoice->academicYear->id,
                'label' => $invoice->academicYear->label,
                'is_current' => $invoice->academicYear->is_current,
            ],
            'classroom_name' => $invoice->enrollment->classroom->name(),
            'payer' => $invoice->payer === null ? null : ['name' => $invoice->payer->name],
            'left_on' => $invoice->enrollment->left_on?->toDateString(),
            'total' => (int) $invoice->total(),
            'discount_total' => (int) -Amount::sum($invoice->lines->filter(static fn (InvoiceLine $line): bool => $line->kind === LineKind::Discount)),
            'balance' => [
                'settled' => $balance->settled,
                'remaining' => $balance->remaining,
                'overdue' => $balance->overdue,
                'credit' => $balance->credit,
                'next' => $balance->next,
            ],
            'lines' => InvoiceLineResource::collection($invoice->lines),
            'schedule' => $balance->schedule,
            'payments' => PaymentResource::collection($invoice->payments),
            'refunds' => RefundResource::collection($invoice->refunds),
            'transfers' => CreditTransferResource::collection($transfers),
            'credit_targets' => CreditTargetResource::collection($view->creditTargets),
            'available_options' => InvoiceOptionResource::collection($view->availableOptions),
            'can_manage' => $view->canManage,
            'can_collect' => $view->canManage,
            'can_discount' => $view->canDiscount,
            'can_cancel' => $view->canCancel,
            'can_refund' => $view->canRefund,
        ];
    }
}
