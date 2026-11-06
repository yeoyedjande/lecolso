<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use App\Domains\Attendance\Data\PlannedAbsenceView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Absence annoncée par un parent, vue par l'école : élève, classe, du … au …, motif, statut (pending, accepted,
 * refused), auteurs et dates, droit de décider.
 *
 * @property-read PlannedAbsenceView $resource
 */
final class PlannedAbsenceResource extends JsonResource
{
    /**
     * @return array{id: string, student: AttendanceStudentResource, classroom: array{id: string, name: string}, starts_on: string, ends_on: string, reason: string, status: string, submitted_by_name: string, submitted_at: string, decided_by_name: string|null, decided_at: string|null, decision_note: string|null, can_decide: bool}
     */
    public function toArray(Request $request): array
    {
        $planned = $this->resource->planned;

        return [
            'id' => $planned->id,
            'student' => new AttendanceStudentResource($planned->student),
            'classroom' => ['id' => $this->resource->classroom->id, 'name' => $this->resource->classroom->name()],
            'starts_on' => $planned->starts_on->toDateString(),
            'ends_on' => $planned->ends_on->toDateString(),
            'reason' => $planned->reason,
            'status' => $planned->status->value,
            'submitted_by_name' => $planned->submitted_by_name,
            'submitted_at' => $planned->created_at->toIso8601String(),
            'decided_by_name' => $planned->decided_by_name,
            'decided_at' => $planned->decided_at?->toIso8601String(),
            'decision_note' => $planned->decision_note,
            'can_decide' => $this->resource->canDecide,
        ];
    }
}
