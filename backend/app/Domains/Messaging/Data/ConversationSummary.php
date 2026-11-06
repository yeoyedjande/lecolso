<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Data;

use App\Domains\Messaging\Enums\MessageSide;
use App\Domains\Messaging\Models\Conversation;
use App\Domains\Messaging\Models\Message;

/** Fil vu par un compte : dernier message, nombre de messages non lus, côté du compte et droit de répondre. */
final readonly class ConversationSummary
{
    public function __construct(
        public Conversation $conversation,
        public ?Message $last,
        public int $unread,
        public MessageSide $side,
        public bool $canWrite,
    ) {}
}
