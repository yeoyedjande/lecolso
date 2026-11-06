<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Resources;

use App\Domains\Academic\Models\Cycle;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read Cycle $resource
 */
final class CycleResource extends JsonResource
{
    /**
     * @return array{id: string, code: string, name: string, position: int, is_active: bool, settings: array{term_type: string, assessment_mode: string, attendance_mode: string, billing_period: string, report_document: string, daily_log: string, grade_scale: string}, levels: AnonymousResourceCollection}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'code' => $this->resource->code,
            'name' => $this->resource->name,
            'position' => $this->resource->position,
            'is_active' => $this->resource->is_active,
            'settings' => $this->resource->settings->toArray(),
            'levels' => LevelResource::collection($this->resource->levels),
        ];
    }
}
