<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Requests;

use App\Domains\Attendance\Enums\DaycareLogKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Entrée du journal de garderie : heure HH:MM, type (repas, sieste, change, humeur, activité, santé), note. */
final class DaycareLogRequest extends FormRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'student_id' => ['required', 'uuid'],
            'time' => ['required', 'date_format:H:i'],
            'kind' => ['required', Rule::enum(DaycareLogKind::class)],
            'note' => ['required', 'string', 'min:1', 'max:500'],
        ];
    }
}
