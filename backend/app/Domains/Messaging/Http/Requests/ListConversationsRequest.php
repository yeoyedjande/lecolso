<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Fils visibles par l'utilisateur ; `unread=1` : seulement ceux qui ont des messages non lus. */
final class ListConversationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** `unread=true` ou `false` (query string d'un navigateur) : lu comme booléen. */
    protected function prepareForValidation(): void
    {
        $unread = $this->query('unread');
        if (is_string($unread) && in_array(strtolower($unread), ['true', 'false'], true)) {
            $this->merge(['unread' => strtolower($unread) === 'true' ? '1' : '0']);
        }
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['unread' => ['nullable', 'boolean']];
    }
}
