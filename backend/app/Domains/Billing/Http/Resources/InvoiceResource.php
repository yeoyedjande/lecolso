<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Data\InvoiceView;
use App\Domains\Billing\Enums\LineKind;
use App\Domains\Billing\Models\Installment;
use App\Domains\Billing\Models\InvoiceLine;
use App\Domains\Billing\Support\Amount;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Facture d'un élève pour une année. Montants en FCFA (entiers) ; une remise est négative. `schedule` : montant dû
 * par date (toutes lignes confondues, remises déduites). `available_options` : services ajoutables (grille du niveau).
 *
 * @property-read InvoiceView $resource
 */
final class InvoiceResource extends JsonResource
{
    /**
     * @return array{id: string, academic_year: array{id: string, label: string, is_current: bool}, classroom_name: string, payer: array{name: string}|null, total: int, discount_total: int, lines: AnonymousResourceCollection<InvoiceLineResource>, schedule: list<array{due_on: string, label: string, amount: int}>, available_options: AnonymousResourceCollection<InvoiceOptionResource>, can_manage: bool, can_discount: bool}
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;
        $invoice = $view->invoice;

        $schedule = [];
        foreach ($invoice->installments->groupBy(static fn (Installment $installment): string => $installment->due_on->toDateString()) as $dueOn => $group) {
            $amount = (int) Amount::sum($group);
            if ($amount === 0) {
                continue;
            }
            $first = $group->sortByDesc('amount')->first();
            $schedule[] = ['due_on' => (string) $dueOn, 'label' => $first instanceof Installment ? $first->label : '', 'amount' => $amount];
        }

        return [
            'id' => $invoice->id,
            'academic_year' => [
                'id' => $invoice->academicYear->id,
                'label' => $invoice->academicYear->label,
                'is_current' => $invoice->academicYear->is_current,
            ],
            'classroom_name' => $invoice->enrollment->classroom->name(),
            'payer' => $invoice->payer === null ? null : ['name' => $invoice->payer->name],
            'total' => (int) $invoice->total(),
            'discount_total' => (int) -Amount::sum($invoice->lines->filter(static fn (InvoiceLine $line): bool => $line->kind === LineKind::Discount)),
            'lines' => InvoiceLineResource::collection($invoice->lines),
            'schedule' => $schedule,
            'available_options' => InvoiceOptionResource::collection($view->availableOptions),
            'can_manage' => $view->canManage,
            'can_discount' => $view->canDiscount,
        ];
    }
}
