<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Resources;

use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Models\Grade;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Évaluation et note de l'enfant (au barème ; `absent`, ou rien : pas encore saisie).
 *
 * @property-read array{assessment: Assessment, grade: Grade|null} $resource
 */
final class ChildAssessmentResource extends JsonResource
{
    /**
     * @return array{id: string, title: string, date: string, out_of: int, value: float|null, absent: bool}
     */
    public function toArray(Request $request): array
    {
        $assessment = $this->resource['assessment'];
        $grade = $this->resource['grade'];

        return [
            'id' => $assessment->id,
            'title' => $assessment->title,
            'date' => $assessment->date->toDateString(),
            'out_of' => (int) $assessment->out_of,
            'value' => $grade === null || $grade->absent || $grade->value === null ? null : (float) $grade->value,
            'absent' => $grade !== null && $grade->absent,
        ];
    }
}
