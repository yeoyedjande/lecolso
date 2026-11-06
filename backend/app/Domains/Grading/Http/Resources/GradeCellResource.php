<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Models\Grade;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Note d'un élève à une évaluation : `value` au barème, `absent`, ou les deux vides (non saisie).
 *
 * @property-read array{assessment_id: string, grade: Grade|null} $resource
 */
final class GradeCellResource extends JsonResource
{
    /**
     * @return array{assessment_id: string, value: float|null, absent: bool}
     */
    public function toArray(Request $request): array
    {
        $grade = $this->resource['grade'];

        return [
            'assessment_id' => $this->resource['assessment_id'],
            'value' => $grade === null || $grade->absent || $grade->value === null ? null : (float) $grade->value,
            'absent' => $grade !== null && $grade->absent,
        ];
    }
}
