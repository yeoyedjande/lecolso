<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Fiche d'un enfant : `term_id` (période des notes ; celle du jour par défaut). Enfant d'un autre parent : 404. */
final class GuardianChildRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['term_id' => ['nullable', 'uuid']];
    }

    public function termId(): ?string
    {
        return $this->filled('term_id') ? $this->string('term_id')->toString() : null;
    }
}
