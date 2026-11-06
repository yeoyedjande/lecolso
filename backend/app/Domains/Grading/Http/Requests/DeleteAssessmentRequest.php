<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

/** Supprimer une évaluation et ses notes. */
final class DeleteAssessmentRequest extends GradingAssessmentRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }
}
