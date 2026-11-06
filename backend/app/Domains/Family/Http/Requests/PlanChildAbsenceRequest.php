<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Prévenir d'une absence à venir : `starts_on`, `ends_on` (AAAA-MM-JJ, aujourd'hui ou plus tard, 30 jours au plus),
 * `reason` (3 à 300 caractères), `message` facultatif pour l'administration. Enfant d'un autre parent : 404.
 */
final class PlanChildAbsenceRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'starts_on' => ['required', 'date_format:Y-m-d'],
            'ends_on' => ['required', 'date_format:Y-m-d'],
            'reason' => ['required', 'string', 'min:3', 'max:300'],
            'message' => ['nullable', 'string', 'max:1500'],
        ];
    }
}
