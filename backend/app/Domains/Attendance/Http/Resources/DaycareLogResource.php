<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use App\Domains\Attendance\Models\DaycareLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Entrée du journal de garderie : heure, type, note.
 *
 * @property-read DaycareLog $resource
 */
final class DaycareLogResource extends JsonResource
{
    /**
     * @return array{id: string, time: string, kind: string, note: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'time' => $this->resource->time,
            'kind' => $this->resource->kind->value,
            'note' => $this->resource->note,
        ];
    }
}
