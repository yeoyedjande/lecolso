<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

/** Modifier une évaluation : mêmes champs qu'à la création ; barème jamais sous une note déjà saisie. */
final class UpdateAssessmentRequest extends GradingAssessmentRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return AssessmentRules::rules();
    }

    /**
     * @return array{subject_id: string, term_id: string, title: string, date: string, out_of: int}
     */
    public function assessmentData(): array
    {
        return AssessmentRules::data($this->validated());
    }
}
