<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Models\Grade;
use App\Domains\Students\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Ligne d'une grille de notes : élève, une note par évaluation (dans l'ordre des colonnes), moyenne de la matière.
 *
 * @property-read array{student: Student, grades: list<array{assessment_id: string, grade: Grade|null}>, average: float|null} $resource
 */
final class GradeGridRowResource extends JsonResource
{
    /**
     * @return array{student: GradingStudentResource, grades: AnonymousResourceCollection, average: float|null}
     */
    public function toArray(Request $request): array
    {
        return [
            'student' => new GradingStudentResource($this->resource['student']),
            'grades' => GradeCellResource::collection($this->resource['grades']),
            'average' => $this->resource['average'] === null ? null : (float) $this->resource['average'],
        ];
    }
}
