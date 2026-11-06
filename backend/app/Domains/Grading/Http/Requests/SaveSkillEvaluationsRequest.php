<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

use App\Domains\Grading\Enums\SkillLevel;
use Illuminate\Support\Carbon;

/**
 * Compétences d'une classe pour une période : `term_id`, `evaluations` (élève, compétence, `level` A, EA, NA ou null
 * pour effacer), `recorded_at` (saisie hors connexion). Droit de saisie contrôlé par l'Action.
 */
final class SaveSkillEvaluationsRequest extends GradingClassroomRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return AssessmentRules::skillRules();
    }

    /**
     * @return list<array{student_id: string, skill_id: string, level: SkillLevel|null}>
     */
    public function evaluations(): array
    {
        return AssessmentRules::evaluations($this->validated());
    }

    public function termId(): string
    {
        return $this->string('term_id')->toString();
    }

    public function recordedAt(): ?Carbon
    {
        return $this->filled('recorded_at') ? Carbon::parse($this->string('recorded_at')->toString()) : null;
    }
}
