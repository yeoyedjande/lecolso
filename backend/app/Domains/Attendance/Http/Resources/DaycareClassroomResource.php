<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Models\DaycareLog;
use App\Domains\Attendance\Models\DaycareVisit;
use App\Domains\Students\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Classe de garderie : enfants avec leur passage du jour et leur journal ; `can_record` : saisir arrivées, départs
 * et journal.
 *
 * @property-read array{classroom: Classroom, can_record: bool, children: list<array{student: Student, visit: DaycareVisit|null, logs: list<DaycareLog>}>} $resource
 */
final class DaycareClassroomResource extends JsonResource
{
    /**
     * @return array{id: string, name: string, can_record: bool, children: AnonymousResourceCollection<DaycareChildResource>}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource['classroom']->id,
            'name' => $this->resource['classroom']->name(),
            'can_record' => (bool) $this->resource['can_record'],
            'children' => DaycareChildResource::collection($this->resource['children']),
        ];
    }
}
