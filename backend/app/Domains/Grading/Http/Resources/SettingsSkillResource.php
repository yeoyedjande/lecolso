<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Models\Skill;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Compétence dans les réglages ; `used` : déjà évaluée (elle ne peut être retirée).
 *
 * @property-read array{skill: Skill, used: bool} $resource
 */
final class SettingsSkillResource extends JsonResource
{
    /**
     * @return array{id: string, domain: string, label: string, position: int, used: bool}
     */
    public function toArray(Request $request): array
    {
        $skill = $this->resource['skill'];

        return [
            'id' => $skill->id,
            'domain' => $skill->domain,
            'label' => $skill->label,
            'position' => $skill->position,
            'used' => (bool) $this->resource['used'],
        ];
    }
}
