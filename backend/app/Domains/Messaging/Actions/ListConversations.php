<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Data\ConversationSummary;
use App\Domains\Messaging\Data\ConversationView;
use App\Domains\Messaging\Enums\MessageSide;
use App\Domains\Messaging\Models\Conversation;
use App\Domains\Messaging\Models\ConversationRead;
use App\Domains\Messaging\Models\Message;
use App\Domains\Messaging\Support\ConversationAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;

/** Fils visibles par le compte, le plus récent d'abord, avec leurs non-lus ; un fil complet avec ses messages. */
final readonly class ListConversations
{
    private const int LIMIT = 200;

    public function __construct(private ConversationAccess $access) {}

    /**
     * @return list<ConversationSummary>
     */
    public function handle(User $user, bool $unreadOnly = false): array
    {
        $conversations = $this->access->query($user)
            ->with(['student', 'guardian', 'classroom.level'])
            ->orderByDesc('last_message_at')
            ->limit(self::LIMIT)
            ->get()
            ->filter(fn (Conversation $conversation): bool => $this->access->canRead($user, $conversation))
            ->values();
        if ($conversations->isEmpty()) {
            return [];
        }

        $ids = $conversations->modelKeys();
        $guardians = $this->access->guardianIds($user);
        // Non lus en une requête : messages de l'autre côté, après la dernière lecture du compte
        $unread = Message::query()
            ->join('conversations', 'conversations.id', '=', 'messages.conversation_id')
            ->leftJoin('conversation_reads', static fn (JoinClause $join) => $join->on('conversation_reads.conversation_id', '=', 'messages.conversation_id')
                ->where('conversation_reads.user_id', '=', $user->id))
            ->whereIn('messages.conversation_id', $ids)
            ->where(static fn (Builder $other) => $other
                ->where(static fn (Builder $q) => $q->whereIn('conversations.guardian_id', $guardians)->where('messages.side', MessageSide::School))
                ->orWhere(static fn (Builder $q) => $q->whereNotIn('conversations.guardian_id', $guardians)->where('messages.side', MessageSide::Guardian)))
            ->where(static fn (Builder $q) => $q->whereNull('conversation_reads.read_at')->orWhereColumn('messages.sent_at', '>', 'conversation_reads.read_at'))
            ->groupBy('messages.conversation_id')
            ->selectRaw('messages.conversation_id, count(*) as unread')
            ->pluck('unread', 'messages.conversation_id');
        $last = Message::query()->whereIn('id', Message::query()->selectRaw('DISTINCT ON (conversation_id) id')
            ->whereIn('conversation_id', $ids)->orderBy('conversation_id')->orderByDesc('sent_at'))
            ->get()->keyBy('conversation_id');

        $summaries = [];
        foreach ($conversations as $conversation) {
            $count = $unread->get($conversation->id);
            $summary = new ConversationSummary(
                $conversation,
                $last->get($conversation->id),
                is_numeric($count) ? (int) $count : 0,
                $this->access->sideOf($user, $conversation),
                $this->access->canWrite($user, $conversation),
            );
            if (! $unreadOnly || $summary->unread > 0) {
                $summaries[] = $summary;
            }
        }

        return $summaries;
    }

    public function show(User $user, Conversation $conversation): ConversationView
    {
        $conversation->loadMissing(['student', 'guardian', 'classroom.level']);
        $messages = Message::query()->where('conversation_id', $conversation->id)->with('plannedAbsence')
            ->orderBy('sent_at')->orderBy('id')->get();
        $read = ConversationRead::query()->where('conversation_id', $conversation->id)->where('user_id', $user->id)->value('read_at');

        return new ConversationView(
            $this->summary($user, $conversation, $read, $messages->last()),
            array_values($messages->all()),
        );
    }

    /** Nombre de fils comptant au moins un message non lu (pastille de la navigation). */
    public function unreadCount(User $user): int
    {
        return count($this->handle($user, true));
    }

    private function summary(User $user, Conversation $conversation, mixed $readAt, ?Message $last): ConversationSummary
    {
        $side = $this->access->sideOf($user, $conversation);
        $other = $side === MessageSide::Guardian ? MessageSide::School : MessageSide::Guardian;
        $unread = Message::query()->where('conversation_id', $conversation->id)->where('side', $other)
            ->when($readAt !== null, static fn (Builder $q) => $q->where('sent_at', '>', $readAt))
            ->count();

        return new ConversationSummary($conversation, $last, $unread, $side, $this->access->canWrite($user, $conversation));
    }
}
