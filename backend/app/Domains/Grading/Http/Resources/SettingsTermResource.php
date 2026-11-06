<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Models\Term;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Période dans les réglages ; `used` : des évaluations s'y rattachent.
 *
 * @property-read array{term: Term, used: bool} $resource
 */
final class SettingsTermResource extends JsonResource
{
    /**
     * @return array{id: string, position: int, label: string, starts_on: string, ends_on: string, used: bool}
     */
    public function toArray(Request $request): array
    {
        $term = $this->resource['term'];

        return [
            'id' => $term->id,
            'position' => $term->position,
            'label' => $term->label,
            'starts_on' => $term->starts_on->toDateString(),
            'ends_on' => $term->ends_on->toDateString(),
            'used' => (bool) $this->resource['used'],
        ];
    }
}
