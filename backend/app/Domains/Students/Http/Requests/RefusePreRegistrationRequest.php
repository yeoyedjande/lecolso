<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

/** Refus d'une pré-inscription : motif obligatoire, envoyé au parent par SMS. */
final class RefusePreRegistrationRequest extends PreRegistrationRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['reason' => ['required', 'string', 'min:3', 'max:200']];
    }
}
