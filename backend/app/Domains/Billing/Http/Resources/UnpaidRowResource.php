<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Data\UnpaidRow;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Facture en retard (FCFA) : élève, classe, cycle, année, payeur et son téléphone, montant en retard, reste dû,
 * plus ancienne échéance non réglée et jours de retard, dernière relance du payeur, droit de relancer.
 *
 * @property-read UnpaidRow $resource
 */
final class UnpaidRowResource extends JsonResource
{
    /**
     * @return array{invoice_id: string, student: array{id: string, full_name: string, matricule: string}, classroom_name: string, cycle: array{id: string, code: string}, academic_year_label: string, payer: array{name: string, phone: string|null}|null, overdue: int, remaining: int, oldest_due_on: string, days_late: int, last_reminder: array{at: string, status: string}|null, can_remind: bool}
     */
    public function toArray(Request $request): array
    {
        $row = $this->resource;
        $invoice = $row->invoice;
        $cycle = $invoice->enrollment->classroom->level->cycle;
        $payer = $invoice->payer;

        return [
            'invoice_id' => $invoice->id,
            'student' => [
                'id' => $invoice->student->id,
                'full_name' => $invoice->student->fullName(),
                'matricule' => $invoice->student->matricule,
            ],
            'classroom_name' => $invoice->enrollment->classroom->name(),
            'cycle' => ['id' => $cycle->id, 'code' => $cycle->code],
            'academic_year_label' => $invoice->academicYear->label,
            'payer' => $payer === null ? null : ['name' => $payer->name, 'phone' => $payer->guardian?->phone],
            'overdue' => (int) $row->overdue,
            'remaining' => (int) $row->remaining,
            'oldest_due_on' => $row->oldestDueOn,
            'days_late' => (int) $row->daysLate,
            'last_reminder' => $row->lastReminder === null ? null : [
                'at' => $row->lastReminder->created_at->toIso8601String(),
                'status' => $row->lastReminder->status->value,
            ],
            'can_remind' => $row->canRemind,
        ];
    }
}
