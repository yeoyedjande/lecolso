<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Models\Assessment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Évaluation d'une classe : matière, période, titre, date, barème.
 *
 * @property-read Assessment $resource
 */
final class AssessmentResource extends JsonResource
{
    /**
     * @return array{id: string, classroom_id: string, subject_id: string, term_id: string, title: string, date: string, out_of: int}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'classroom_id' => $this->resource->classroom_id,
            'subject_id' => $this->resource->subject_id,
            'term_id' => $this->resource->term_id,
            'title' => $this->resource->title,
            'date' => $this->resource->date->toDateString(),
            'out_of' => $this->resource->out_of,
        ];
    }
}
