<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Data\ClassResultsView;
use App\Domains\Grading\Models\Subject;
use App\Domains\Students\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Résultats d'une classe pour une période. Moyenne pondérée : moyennes par matière, moyenne générale, rang (ex aequo
 * au même rang), moyenne de classe, plus forte et plus faible. Compétences : nombre de A, EA, NA par élève.
 *
 * @property-read ClassResultsView $resource
 */
final class ClassResultsResource extends JsonResource
{
    /**
     * @return array{classroom: array{id: string, name: string}, mode: string, grade_scale: int, terms: AnonymousResourceCollection, term: TermResource, subjects: AnonymousResourceCollection, rows: AnonymousResourceCollection, class_average: float|null, highest: float|null, lowest: float|null, ranked_count: int}
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;
        $settings = $view->classroom->level->cycle->settings;
        $results = $view->results;
        $ranked = 0;

        $rows = [];
        foreach ($view->students as $student) {
            /** @var Student $student */
            $result = $results->for($student->id);
            if ($result?->rank !== null) {
                $ranked++;
            }
            $rows[] = [
                'student' => $student,
                'subjects' => array_values($view->subjects->map(static fn (Subject $subject): array => [
                    'subject_id' => $subject->id,
                    'average' => $result?->subjects[$subject->id] ?? null,
                ])->all()),
                'average' => $result?->average,
                'rank' => $result?->rank,
                'skills' => $result?->skills,
            ];
        }

        return [
            'classroom' => ['id' => $view->classroom->id, 'name' => $view->classroom->name()],
            'mode' => $settings->assessmentMode->value,
            'grade_scale' => $settings->gradeScale->max(),
            'terms' => TermResource::collection($view->terms),
            'term' => new TermResource($view->term),
            'subjects' => SubjectResource::collection($view->subjects),
            'rows' => ClassResultRowResource::collection($rows),
            'class_average' => $results->classAverage,
            'highest' => $results->highest,
            'lowest' => $results->lowest,
            'ranked_count' => $ranked,
        ];
    }
}
