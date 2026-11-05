<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Data\InvoiceView;
use App\Domains\Billing\Enums\LineKind;
use App\Domains\Billing\Models\FeeType;
use App\Domains\Billing\Models\Installment;
use App\Domains\Billing\Models\InvoiceLine;
use App\Domains\Billing\Support\Amount;
use Illuminate\Http\Request;
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
     * @return array{id: string, academic_year: array{id: string, label: string, is_current: bool}, classroom_name: string, payer: array{name: string}|null, total: int, discount_total: int, lines: list<array{id: string, kind: string, fee_type_id: string|null, fee_type_code: string|null, is_optional: bool, label: string, amount: int, reason: string|null}>, schedule: list<array{due_on: string, label: string, amount: int}>, available_options: list<array{fee_type_id: string, code: string, name: string, amount: int}>, can_manage: bool, can_discount: bool}
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;
        $invoice = $view->invoice;

        $schedule = [];
        foreach ($invoice->installments->groupBy(static fn (Installment $installment): string => $installment->due_on->toDateString()) as $dueOn => $group) {
            $amount = Amount::sum($group);
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
            'total' => $invoice->total(),
            'discount_total' => -Amount::sum($invoice->lines->filter(static fn (InvoiceLine $line): bool => $line->kind === LineKind::Discount)),
            'lines' => array_values($invoice->lines->map(static fn (InvoiceLine $line): array => [
                'id' => $line->id,
                'kind' => $line->kind->value,
                'fee_type_id' => $line->fee_type_id,
                'fee_type_code' => $line->feeType?->code,
                'is_optional' => $line->feeType?->is_optional === true,
                'label' => $line->label,
                'amount' => $line->amount,
                'reason' => $line->reason,
            ])->all()),
            'schedule' => $schedule,
            'available_options' => array_values($view->availableOptions->map(static function (array $option): array {
                /** @var FeeType $type */
                $type = $option['type'];

                return ['fee_type_id' => $type->id, 'code' => $type->code, 'name' => $type->name, 'amount' => $option['amount']];
            })->all()),
            'can_manage' => $view->canManage,
            'can_discount' => $view->canDiscount,
        ];
    }
}
