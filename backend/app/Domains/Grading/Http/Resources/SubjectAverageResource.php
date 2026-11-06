<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Moyenne d'un élève dans une matière sur l'échelle du cycle (null : aucune note).
 *
 * @property-read array{subject_id: string, average: float|null} $resource
 */
final class SubjectAverageResource extends JsonResource
{
    /**
     * @return array{subject_id: string, average: float|null}
     */
    public function toArray(Request $request): array
    {
        return [
            'subject_id' => $this->resource['subject_id'],
            'average' => $this->resource['average'] === null ? null : (float) $this->resource['average'],
        ];
    }
}
