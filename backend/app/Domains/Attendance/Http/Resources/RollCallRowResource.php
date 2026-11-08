<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Models\PlannedAbsence;
use App\Domains\Students\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Ligne d'un appel : élève, statut (present si rien n'est noté ; absent proposé tant que l'appel n'est pas fait si un
 * parent a annoncé l'absence), minutes de retard, justification éventuelle, absence annoncée (`planned`).
 *
 * @property-read array{student: Student, mark: AttendanceMark|null, planned: PlannedAbsence|null, taken: bool} $resource
 */
final class RollCallRowResource extends JsonResource
{
    /**
     * @return array{student: AttendanceStudentResource, mark_id: string|null, status: string, late_minutes: int|null, justification: array{status: string, source: string}|null, planned: array{id: string, status: string}|null}
     */
    public function toArray(Request $request): array
    {
        $mark = $this->resource['mark'];
        $planned = $this->resource['planned'];
        $justification = $mark?->justification;
        $status = $mark !== null ? $mark->status->value : ($planned !== null && ! $this->resource['taken'] ? 'absent' : 'present');

        return [
            'student' => new AttendanceStudentResource($this->resource['student']),
            'mark_id' => $mark?->id,
            'status' => $status,
            'late_minutes' => $mark?->late_minutes,
            'justification' => $justification === null ? null : ['status' => $justification->status->value, 'source' => $justification->source->value],
            'planned' => $planned === null ? null : ['id' => $planned->id, 'status' => $planned->status->value],
        ];
    }
}
