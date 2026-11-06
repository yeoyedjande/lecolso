<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

/** Bulletins d'une classe : `term_id` (période du jour par défaut). */
final class ReportCardsRequest extends GradingClassroomRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['term_id' => ['nullable', 'uuid']];
    }
}
