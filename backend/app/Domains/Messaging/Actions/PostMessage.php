<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Models\Conversation;
use App\Domains\Messaging\Models\ConversationRead;
use App\Domains\Messaging\Models\Message;
use App\Domains\Messaging\Support\ConversationAccess;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Envoie un message dans un fil (parent du fil, titulaire d'un fil « enseignant », administration du cycle). */
final readonly class PostMessage
{
    public function __construct(private ConversationAccess $access) {}

    /**
     * @throws AuthorizationException
     */
    public function handle(User $author, Conversation $conversation, string $body, Carbon $now, ?string $plannedAbsenceId = null): Message
    {
        if (! $this->access->canWrite($author, $conversation)) {
            throw new AuthorizationException;
        }
        $side = $this->access->sideOf($author, $conversation);

        return DB::transaction(static function () use ($author, $conversation, $body, $now, $plannedAbsenceId, $side): Message {
            $message = Message::query()->create([
                'conversation_id' => $conversation->id,
                'side' => $side,
                'author_id' => $author->id,
                'author_name' => $author->name,
                'body' => $body,
                'planned_absence_id' => $plannedAbsenceId,
                'sent_at' => $now,
            ]);
            $conversation->forceFill(['last_message_at' => $now])->save();
            // L'auteur a lu le fil jusqu'à son propre message
            ConversationRead::query()->updateOrCreate(
                ['conversation_id' => $conversation->id, 'user_id' => $author->id],
                ['read_at' => $now],
            );

            return $message;
        });
    }
}
