<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Data\GradeGridView;
use App\Domains\Grading\Models\Assessment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Grille de notes d'une classe pour une période et une matière. `grades` : une entrée par évaluation de la ligne
 * (`value` au barème, `absent`, ou les deux vides : non saisie) ; `average` : moyenne de la matière sur l'échelle.
 *
 * @property-read GradeGridView $resource
 */
final class GradeGridResource extends JsonResource
{
    /**
     * @return array{classroom: array{id: string, name: string}, grade_scale: int, terms: AnonymousResourceCollection, term: TermResource, subjects: AnonymousResourceCollection, subject: SubjectResource|null, assessments: AnonymousResourceCollection, rows: AnonymousResourceCollection, can_manage: bool, closed: bool}
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;

        return [
            'classroom' => ['id' => $view->classroom->id, 'name' => $view->classroom->name()],
            'grade_scale' => $view->classroom->level->cycle->settings->gradeScale->max(),
            'terms' => TermResource::collection($view->terms),
            'term' => new TermResource($view->term),
            'subjects' => SubjectResource::collection($view->subjects),
            'subject' => $view->subject === null ? null : new SubjectResource($view->subject),
            'assessments' => AssessmentResource::collection($view->assessments),
            'rows' => GradeGridRowResource::collection(array_map(static fn (array $row): array => [
                'student' => $row['student'],
                'grades' => array_values($view->assessments->map(static fn (Assessment $assessment): array => [
                    'assessment_id' => $assessment->id,
                    'grade' => $row['grades'][$assessment->id] ?? null,
                ])->all()),
                'average' => $row['average'],
            ], $view->rows)),
            'can_manage' => $view->canManage,
            'closed' => $view->closed,
        ];
    }
}
