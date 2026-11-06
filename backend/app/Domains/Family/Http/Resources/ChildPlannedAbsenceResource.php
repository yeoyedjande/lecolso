<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Resources;

use App\Domains\Attendance\Models\PlannedAbsence;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Absence annoncée par le parent : du … au …, motif, statut (pending, accepted, refused) et note de l'école.
 *
 * @property-read PlannedAbsence $resource
 */
final class ChildPlannedAbsenceResource extends JsonResource
{
    /**
     * @return array{id: string, starts_on: string, ends_on: string, reason: string, status: string, note: string|null}
     */
    public function toArray(Request $request): array
    {
        $planned = $this->resource;

        return [
            'id' => $planned->id,
            'starts_on' => $planned->starts_on->toDateString(),
            'ends_on' => $planned->ends_on->toDateString(),
            'reason' => $planned->reason,
            'status' => $planned->status->value,
            'note' => $planned->decision_note,
        ];
    }
}
