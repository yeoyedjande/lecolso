<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Resources;

use App\Domains\Academic\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read AcademicYear $resource
 */
final class AcademicYearResource extends JsonResource
{
    /**
     * @return array{id: string, label: string, starts_on: string, ends_on: string, status: string, is_current: bool}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'label' => $this->resource->label,
            'starts_on' => $this->resource->starts_on->toDateString(),
            'ends_on' => $this->resource->ends_on->toDateString(),
            'status' => $this->resource->status->value,
            'is_current' => $this->resource->is_current,
        ];
    }
}
