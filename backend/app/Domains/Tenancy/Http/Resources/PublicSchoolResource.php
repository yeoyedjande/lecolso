<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Resources;

use App\Domains\Tenancy\Data\PublicSchoolProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read PublicSchoolProfile $resource
 */
final class PublicSchoolResource extends JsonResource
{
    /**
     * @return array{name: string, slug: string, city: string|null, type: string, cycles: list<array{code: string, name: string, levels: list<string>}>}
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->resource->name,
            'slug' => $this->resource->slug,
            'city' => $this->resource->city,
            'type' => $this->resource->type,
            'cycles' => $this->resource->cycles,
        ];
    }
}
