<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use App\Domains\Attendance\Data\DaycareBoardView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Garderie d'un jour : classes en arrivées et départs, enfants, passage du jour (heures, personnes), journal.
 *
 * @property-read DaycareBoardView $resource
 */
final class DaycareBoardResource extends JsonResource
{
    /**
     * @return array{date: string, classrooms: AnonymousResourceCollection<DaycareClassroomResource>}
     */
    public function toArray(Request $request): array
    {
        return [
            'date' => $this->resource->date,
            'classrooms' => DaycareClassroomResource::collection($this->resource->classrooms),
        ];
    }
}
