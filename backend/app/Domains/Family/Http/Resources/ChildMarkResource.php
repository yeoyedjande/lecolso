<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Resources;

use App\Domains\Attendance\Enums\AttendanceStatus;
use App\Domains\Attendance\Enums\JustificationStatus;
use App\Domains\Attendance\Models\AttendanceMark;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Absence ou retard de l'enfant, avec sa justification ; `can_justify` : une absence sans justification acceptée.
 *
 * @property-read AttendanceMark $resource
 */
final class ChildMarkResource extends JsonResource
{
    /**
     * @return array{id: string, date: string, status: string, late_minutes: int|null, justification: array{status: string, reason: string, note: string|null}|null, can_justify: bool}
     */
    public function toArray(Request $request): array
    {
        $mark = $this->resource;
        $justification = $mark->justification;

        return [
            'id' => $mark->id,
            'date' => $mark->date->toDateString(),
            'status' => $mark->status->value,
            'late_minutes' => $mark->late_minutes === null ? null : (int) $mark->late_minutes,
            'justification' => $justification === null ? null : [
                'status' => $justification->status->value,
                'reason' => $justification->reason,
                'note' => $justification->decision_note === null ? null : (string) $justification->decision_note,
            ],
            'can_justify' => $mark->status === AttendanceStatus::Absent && $justification?->status !== JustificationStatus::Accepted,
        ];
    }
}
