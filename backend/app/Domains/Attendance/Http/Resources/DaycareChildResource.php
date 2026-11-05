<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use App\Domains\Attendance\Models\DaycareLog;
use App\Domains\Attendance\Models\DaycareVisit;
use App\Domains\Students\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Enfant à la garderie : passage du jour (arrivée, départ HH:MM, personnes) et journal.
 *
 * @property-read array{student: Student, visit: DaycareVisit|null, logs: list<DaycareLog>} $resource
 */
final class DaycareChildResource extends JsonResource
{
    /**
     * @return array{student: AttendanceStudentResource, visit: array{arrived_at: string|null, left_at: string|null, dropped_by: string|null, picked_up_by: string|null}|null, logs: AnonymousResourceCollection<DaycareLogResource>}
     */
    public function toArray(Request $request): array
    {
        $visit = $this->resource['visit'];

        return [
            'student' => new AttendanceStudentResource($this->resource['student']),
            'visit' => $visit === null ? null : [
                'arrived_at' => $visit->arrived_at,
                'left_at' => $visit->left_at,
                'dropped_by' => $visit->dropped_by,
                'picked_up_by' => $visit->picked_up_by,
            ],
            'logs' => DaycareLogResource::collection($this->resource['logs']),
        ];
    }
}
