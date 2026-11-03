<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Resources;

use App\Domains\Academic\Models\Level;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read Level $resource
 */
final class LevelResource extends JsonResource
{
    /**
     * @return array{id: string, code: string, name: string, position: int}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'code' => $this->resource->code,
            'name' => $this->resource->name,
            'position' => $this->resource->position,
        ];
    }
}
