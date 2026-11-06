<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Grading\Data\GradingSettingsView;
use App\Domains\Grading\Models\Skill;
use App\Domains\Grading\Models\Subject;
use App\Domains\Grading\Models\Term;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Réglages des notes d'un cycle pour une année. `used` : déjà utilisé par une évaluation (ne peut être retiré).
 *
 * @property-read GradingSettingsView $resource
 */
final class GradingSettingsResource extends JsonResource
{
    /**
     * @return array{cycle: array{id: string, name: string, mode: string, term_type: string, grade_scale: int}, academic_year: array{id: string, label: string, closed: bool}, terms: AnonymousResourceCollection, levels: AnonymousResourceCollection, skills: AnonymousResourceCollection, can_manage: bool}
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;
        $settings = $view->cycle->settings;
        $used = $view->used;

        return [
            'cycle' => [
                'id' => $view->cycle->id,
                'name' => $view->cycle->name,
                'mode' => $settings->assessmentMode->value,
                'term_type' => $settings->termType->value,
                'grade_scale' => $settings->gradeScale->max(),
            ],
            'academic_year' => ['id' => $view->year->id, 'label' => $view->year->label, 'closed' => $view->year->status === AcademicYearStatus::Closed],
            'terms' => SettingsTermResource::collection($view->terms->map(static fn (Term $term): array => ['term' => $term, 'used' => isset($used[$term->id])])),
            'levels' => SettingsLevelResource::collection(array_map(static fn (array $row): array => [
                'level' => $row['level'],
                'subjects' => array_values($row['subjects']->map(static fn (Subject $subject): array => ['subject' => $subject, 'used' => isset($used[$subject->id])])->all()),
            ], $view->levels)),
            'skills' => SettingsSkillResource::collection($view->skills->map(static fn (Skill $skill): array => ['skill' => $skill, 'used' => isset($used[$skill->id])])),
            'can_manage' => $view->canManage,
        ];
    }
}
