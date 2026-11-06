<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Arrivée (`in`) ou départ (`out`) d'un enfant à la garderie : heure HH:MM, personne qui le dépose ou le récupère.
 * Droits contrôlés par l'Action (classe de l'enfant).
 */
final class DaycareCheckRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'student_id' => ['required', 'uuid'],
            'direction' => ['required', 'in:in,out'],
            'time' => ['required', 'date_format:H:i'],
            'person' => ['nullable', 'string', 'max:120'],
        ];
    }
}
