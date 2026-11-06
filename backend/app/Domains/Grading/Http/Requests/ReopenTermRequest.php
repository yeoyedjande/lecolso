<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

/** Déverrouiller les bulletins d'une classe : `term_id`, `reason` (motif obligatoire). Droit contrôlé par l'Action. */
final class ReopenTermRequest extends GradingClassroomRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'term_id' => ['required', 'uuid'],
            'reason' => ['required', 'string', 'min:3', 'max:200'],
        ];
    }

    public function termId(): string
    {
        return $this->string('term_id')->toString();
    }

    public function reason(): string
    {
        return trim($this->string('reason')->toString());
    }
}
