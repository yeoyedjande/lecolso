<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Models\FeeType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property-read FeeType $resource
 */
final class FeeTypeResource extends JsonResource
{
    /**
     * @return array{id: string, code: string, name: string, billing: string, is_optional: bool}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'code' => $this->resource->code,
            'name' => $this->resource->name,
            'billing' => $this->resource->billing->value,
            'is_optional' => $this->resource->is_optional,
        ];
    }
}
