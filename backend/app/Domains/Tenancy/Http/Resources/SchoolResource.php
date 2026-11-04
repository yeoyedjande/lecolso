<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Resources;

use App\Domains\Tenancy\Models\School;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read School $resource
 */
final class SchoolResource extends JsonResource
{
    /**
     * @return array{id: string, organization_id: string|null, name: string, slug: string, type: string, city: string|null, currency: string, created_at: string|null}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'organization_id' => $this->resource->organization_id,
            'name' => $this->resource->name,
            'slug' => $this->resource->slug,
            'type' => $this->resource->type->value,
            'city' => $this->resource->city,
            'currency' => $this->resource->currency,
            'created_at' => $this->resource->created_at?->toIso8601String(),
        ];
    }
}
