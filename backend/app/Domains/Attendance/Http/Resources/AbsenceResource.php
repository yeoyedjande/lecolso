<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use App\Domains\Attendance\Data\AbsenceView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Absence ou retard : jour, statut (absent, late), minutes de retard, élève, classe, justification et droit de
 * décider (`can_decide` : accepter ou refuser, ou justifier directement au nom de l'école).
 *
 * @property-read AbsenceView $resource
 */
final class AbsenceResource extends JsonResource
{
    /**
     * @return array{id: string, date: string, status: string, late_minutes: int|null, student: AttendanceStudentResource, classroom: array{id: string, name: string}, justification: JustificationResource|null, can_decide: bool}
     */
    public function toArray(Request $request): array
    {
        $mark = $this->resource->mark;
        $classroom = $mark->rollCall->classroom;

        return [
            'id' => $mark->id,
            'date' => $mark->date->toDateString(),
            'status' => $mark->status->value,
            'late_minutes' => $mark->late_minutes,
            'student' => new AttendanceStudentResource($mark->student),
            'classroom' => ['id' => $classroom->id, 'name' => $classroom->name()],
            'justification' => $mark->justification === null ? null : new JustificationResource($mark->justification),
            'can_decide' => $this->resource->canDecide,
        ];
    }
}
