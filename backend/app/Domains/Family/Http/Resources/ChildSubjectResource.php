<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Resources;

use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Models\Grade;
use App\Domains\Grading\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Matière dans la fiche d'un enfant : coefficient, moyenne de la période (échelle du cycle) et ses évaluations.
 *
 * @property-read array{subject: Subject, average: float|null, assessments: list<array{assessment: Assessment, grade: Grade|null}>} $resource
 */
final class ChildSubjectResource extends JsonResource
{
    /**
     * @return array{id: string, name: string, coefficient: int, average: float|null, assessments: AnonymousResourceCollection}
     */
    public function toArray(Request $request): array
    {
        $subject = $this->resource['subject'];

        return [
            'id' => $subject->id,
            'name' => $subject->name,
            'coefficient' => (int) $subject->coefficient,
            'average' => $this->resource['average'] === null ? null : (float) $this->resource['average'],
            'assessments' => ChildAssessmentResource::collection($this->resource['assessments']),
        ];
    }
}
