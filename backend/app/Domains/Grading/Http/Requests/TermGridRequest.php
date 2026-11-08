<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

/** Résultats ou compétences d'une classe : `term_id` (période du jour par défaut). */
final class TermGridRequest extends GradingClassroomRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'term_id' => ['nullable', 'uuid'],
        ];
    }
}
