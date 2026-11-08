<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Models\Skill;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Compétence du référentiel, rangée par domaine.
 *
 * @property-read Skill $resource
 */
final class SkillResource extends JsonResource
{
    /**
     * @return array{id: string, domain: string, label: string, position: int}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'domain' => $this->resource->domain,
            'label' => $this->resource->label,
            'position' => $this->resource->position,
        ];
    }
}
