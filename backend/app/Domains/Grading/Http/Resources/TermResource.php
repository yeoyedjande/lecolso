<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Models\Term;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Période (trimestre, semestre ou période libre).
 *
 * @property-read Term $resource
 */
final class TermResource extends JsonResource
{
    /**
     * @return array{id: string, position: int, label: string, starts_on: string, ends_on: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'position' => $this->resource->position,
            'label' => $this->resource->label,
            'starts_on' => $this->resource->starts_on->toDateString(),
            'ends_on' => $this->resource->ends_on->toDateString(),
        ];
    }
}
