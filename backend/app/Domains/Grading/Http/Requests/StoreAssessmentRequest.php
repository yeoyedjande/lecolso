<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

/**
 * Nouvelle évaluation : `subject_id`, `term_id`, `title`, `date` (dans la période), `out_of` (barème, 1 à 100) ;
 * `id` facultatif (UUID de l'appareil). Droit de saisie contrôlé par l'Action.
 */
final class StoreAssessmentRequest extends GradingClassroomRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [...AssessmentRules::rules(), 'id' => ['nullable', 'uuid']];
    }

    /**
     * @return array{subject_id: string, term_id: string, title: string, date: string, out_of: int}
     */
    public function assessmentData(): array
    {
        return AssessmentRules::data($this->validated());
    }
}
