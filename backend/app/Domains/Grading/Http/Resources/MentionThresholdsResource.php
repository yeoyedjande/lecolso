<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Seuils des mentions d'un cycle, sur son échelle.
 *
 * @property-read array{congratulations: float, honor_roll: float, encouragement: float, warning_below: float} $resource
 */
final class MentionThresholdsResource extends JsonResource
{
    /**
     * @return array{congratulations: float, honor_roll: float, encouragement: float, warning_below: float}
     */
    public function toArray(Request $request): array
    {
        return [
            'congratulations' => (float) $this->resource['congratulations'],
            'honor_roll' => (float) $this->resource['honor_roll'],
            'encouragement' => (float) $this->resource['encouragement'],
            'warning_below' => (float) $this->resource['warning_below'],
        ];
    }
}
