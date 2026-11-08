<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Data\SkillGridView;
use App\Domains\Grading\Models\Skill;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Compétences d'une classe pour une période. `levels` : une entrée par compétence (A, EA, NA, ou null : non évaluée).
 *
 * @property-read SkillGridView $resource
 */
final class SkillGridResource extends JsonResource
{
    /**
     * @return array{classroom: array{id: string, name: string}, terms: AnonymousResourceCollection, term: TermResource, skills: AnonymousResourceCollection, rows: AnonymousResourceCollection, can_manage: bool, closed: bool}
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;

        return [
            'classroom' => ['id' => $view->classroom->id, 'name' => $view->classroom->name()],
            'terms' => TermResource::collection($view->terms),
            'term' => new TermResource($view->term),
            'skills' => SkillResource::collection($view->skills),
            'rows' => SkillGridRowResource::collection(array_map(static fn (array $row): array => [
                'student' => $row['student'],
                'levels' => array_values($view->skills->map(static fn (Skill $skill): array => [
                    'skill_id' => $skill->id,
                    'level' => ($row['levels'][$skill->id] ?? null)?->level,
                ])->all()),
            ], $view->rows)),
            'can_manage' => $view->canManage,
            'closed' => $view->closed,
        ];
    }
}
