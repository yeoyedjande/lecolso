<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Data;

use App\Domains\Messaging\Models\Message;

/** Fil complet : son résumé et ses messages, du plus ancien au plus récent. */
final readonly class ConversationView
{
    /**
     * @param  list<Message>  $messages
     */
    public function __construct(
        public ConversationSummary $summary,
        public array $messages,
    ) {}
}
