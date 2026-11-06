<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Resources;

use App\Domains\Grading\Enums\SkillLevel;
use App\Domains\Grading\Models\Skill;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Compétence et niveau de l'enfant sur la période (A, EA, NA, ou null : pas encore évaluée).
 *
 * @property-read array{skill: Skill, level: SkillLevel|null} $resource
 */
final class ChildSkillResource extends JsonResource
{
    /**
     * @return array{id: string, domain: string, label: string, level: string|null}
     */
    public function toArray(Request $request): array
    {
        $level = $this->resource['level'];

        return [
            'id' => $this->resource['skill']->id,
            'domain' => $this->resource['skill']->domain,
            'label' => $this->resource['skill']->label,
            'level' => $level === null ? null : $level->value,
        ];
    }
}
