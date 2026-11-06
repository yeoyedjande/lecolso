<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Students\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Résultat d'un élève : moyennes par matière, moyenne générale et rang (moyenne pondérée), ou nombre de compétences
 * acquises, en cours et non acquises (compétences).
 *
 * @property-read array{student: Student, subjects: list<array{subject_id: string, average: float|null}>, average: float|null, rank: int|null, skills: array{A: int, EA: int, NA: int}|null} $resource
 */
final class ClassResultRowResource extends JsonResource
{
    /**
     * @return array{student: GradingStudentResource, subjects: AnonymousResourceCollection, average: float|null, rank: int|null, skills: array{A: int, EA: int, NA: int}|null}
     */
    public function toArray(Request $request): array
    {
        $skills = $this->resource['skills'];

        return [
            'student' => new GradingStudentResource($this->resource['student']),
            'subjects' => SubjectAverageResource::collection($this->resource['subjects']),
            'average' => $this->resource['average'] === null ? null : (float) $this->resource['average'],
            'rank' => $this->resource['rank'] === null ? null : (int) $this->resource['rank'],
            'skills' => $skills === null ? null : ['A' => (int) $skills['A'], 'EA' => (int) $skills['EA'], 'NA' => (int) $skills['NA']],
        ];
    }
}
