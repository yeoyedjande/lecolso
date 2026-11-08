<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

/** Grille de notes : `term_id` (période du jour par défaut), `subject_id` (première matière par défaut). */
final class GradeGridRequest extends GradingClassroomRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'term_id' => ['nullable', 'uuid'],
            'subject_id' => ['nullable', 'uuid'],
        ];
    }
}
