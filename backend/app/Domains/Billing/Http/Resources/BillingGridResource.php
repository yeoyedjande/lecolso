<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Data\BillingGrid;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Grille de frais d'une année : montants annuels (FCFA) par niveau et par type, calendrier des échéances par cycle,
 * inscriptions de l'année encore sans facture (cycles gérés par l'utilisateur).
 *
 * @property-read BillingGrid $resource
 */
final class BillingGridResource extends JsonResource
{
    /**
     * @return array{academic_year: array{id: string, label: string, status: string}, fee_types: AnonymousResourceCollection<FeeTypeResource>, cycles: list<array{id: string, code: string, name: string, billing_period: string, can_manage: bool, dates: list<array{position: int, due_on: string, label: string}>, levels: list<array{id: string, code: string, name: string, amounts: list<array{fee_type_id: string, amount: int}>}>}>, pending_invoices: int}
     */
    public function toArray(Request $request): array
    {
        $grid = $this->resource;

        $cycles = [];
        foreach ($grid->cycles as $cycle) {
            $dates = [];
            foreach ($grid->calendars[$cycle->id] ?? [] as $date) {
                $dates[] = ['position' => (int) $date->position, 'due_on' => $date->due_on->toDateString(), 'label' => $date->label];
            }

            $levels = [];
            foreach ($cycle->levels->sortBy('position') as $level) {
                $amounts = [];
                foreach ($grid->amounts as $schedule) {
                    if ($schedule->level_id === $level->id) {
                        $amounts[] = ['fee_type_id' => $schedule->fee_type_id, 'amount' => (int) $schedule->amount];
                    }
                }
                $levels[] = ['id' => $level->id, 'code' => $level->code, 'name' => $level->name, 'amounts' => $amounts];
            }

            $cycles[] = [
                'id' => $cycle->id,
                'code' => $cycle->code,
                'name' => $cycle->name,
                'billing_period' => $cycle->settings->billingPeriod->value,
                'can_manage' => $grid->manageableCycles === null || in_array($cycle->id, $grid->manageableCycles, true),
                'dates' => $dates,
                'levels' => $levels,
            ];
        }

        return [
            'academic_year' => [
                'id' => $grid->year->id,
                'label' => $grid->year->label,
                'status' => $grid->year->status->value,
            ],
            'fee_types' => FeeTypeResource::collection($grid->feeTypes),
            'cycles' => $cycles,
            'pending_invoices' => $grid->pendingInvoices,
        ];
    }
}
