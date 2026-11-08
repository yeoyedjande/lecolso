<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Http\Requests;

use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Models\Conversation;
use App\Domains\Messaging\Support\ConversationAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use LogicException;

/** Fil de la route : un fil que l'utilisateur ne peut pas lire (autre famille, autre classe, autre cycle) est introuvable. */
class ConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user instanceof User || ! app(ConversationAccess::class)->canRead($user, $this->conversation())) {
            throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
        }

        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }

    public function conversation(): Conversation
    {
        $conversation = $this->route('conversation');

        return $conversation instanceof Conversation ? $conversation : throw new LogicException('Fil de la route introuvable.');
    }
}
