<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

/** Valider les bulletins d'une classe (`term_id`), ou relancer leur rendu. Droit contrôlé par l'Action. */
final class CloseTermRequest extends GradingClassroomRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['term_id' => ['required', 'uuid']];
    }

    public function termId(): string
    {
        return $this->string('term_id')->toString();
    }
}
