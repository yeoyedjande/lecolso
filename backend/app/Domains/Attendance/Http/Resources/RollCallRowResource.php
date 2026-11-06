<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Students\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Ligne d'un appel : élève, statut (present si rien n'est noté), minutes de retard, justification éventuelle.
 *
 * @property-read array{student: Student, mark: AttendanceMark|null} $resource
 */
final class RollCallRowResource extends JsonResource
{
    /**
     * @return array{student: AttendanceStudentResource, mark_id: string|null, status: string, late_minutes: int|null, justification: array{status: string, source: string}|null}
     */
    public function toArray(Request $request): array
    {
        $mark = $this->resource['mark'];
        $justification = $mark?->justification;

        return [
            'student' => new AttendanceStudentResource($this->resource['student']),
            'mark_id' => $mark?->id,
            'status' => $mark === null ? 'present' : $mark->status->value,
            'late_minutes' => $mark?->late_minutes,
            'justification' => $justification === null ? null : ['status' => $justification->status->value, 'source' => $justification->source->value],
        ];
    }
}
