<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Matière d'un niveau et son coefficient.
 *
 * @property-read Subject $resource
 */
final class SubjectResource extends JsonResource
{
    /**
     * @return array{id: string, name: string, coefficient: int, position: int}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'name' => $this->resource->name,
            'coefficient' => $this->resource->coefficient,
            'position' => $this->resource->position,
        ];
    }
}
