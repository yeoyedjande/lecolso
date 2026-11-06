<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Http\Requests;

use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Support\ConversationAccess;

/** Réponse dans un fil : `body` (1 à 2000 caractères). Lecture seule (fil d'un enseignant lu par la direction) : 403. */
final class PostMessageRequest extends ConversationRequest
{
    public function authorize(): bool
    {
        parent::authorize();
        $user = $this->user();

        return $user instanceof User && app(ConversationAccess::class)->canWrite($user, $this->conversation());
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['body' => ['required', 'string', 'max:2000']];
    }
}
