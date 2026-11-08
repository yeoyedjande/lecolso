<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Enums\SkillLevel;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Niveau d'un élève dans une compétence : A, EA, NA, ou null (non évaluée).
 *
 * @property-read array{skill_id: string, level: SkillLevel|null} $resource
 */
final class SkillCellResource extends JsonResource
{
    /**
     * @return array{skill_id: string, level: string|null}
     */
    public function toArray(Request $request): array
    {
        $level = $this->resource['level'];

        return [
            'skill_id' => $this->resource['skill_id'],
            'level' => $level === null ? null : $level->value,
        ];
    }
}
