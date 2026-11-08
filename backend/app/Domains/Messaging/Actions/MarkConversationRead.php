<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Models\Conversation;
use App\Domains\Messaging\Models\ConversationRead;
use Illuminate\Support\Carbon;

/** Marque un fil comme lu par le compte (jusqu'à maintenant). */
final class MarkConversationRead
{
    public function handle(User $user, Conversation $conversation, Carbon $now): void
    {
        ConversationRead::query()->updateOrCreate(
            ['conversation_id' => $conversation->id, 'user_id' => $user->id],
            ['read_at' => $now],
        );
    }
}
