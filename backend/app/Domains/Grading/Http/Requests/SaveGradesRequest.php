<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

use Illuminate\Support\Carbon;

/**
 * Notes d'une évaluation : `grades` (élève, `value` au barème avec 2 décimales au plus, ou `absent`; ni l'un ni
 * l'autre : note effacée), `recorded_at` (saisie hors connexion). Droit de saisie contrôlé par l'Action.
 */
final class SaveGradesRequest extends GradingAssessmentRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return AssessmentRules::gradeRules();
    }

    /**
     * @return list<array{student_id: string, value: float|null, absent: bool}>
     */
    public function grades(): array
    {
        return AssessmentRules::grades($this->validated());
    }

    public function recordedAt(): ?Carbon
    {
        return $this->filled('recorded_at') ? Carbon::parse($this->string('recorded_at')->toString()) : null;
    }
}
