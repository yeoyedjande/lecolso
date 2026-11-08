<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Http\Resources;

use App\Domains\Messaging\Data\ConversationSummary;
use App\Domains\Messaging\Enums\MessageSide;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/**
 * Fil vu par l'utilisateur : destinataire (`channel` : teacher ou office), objet, enfant et classe, tuteur (téléphone
 * seulement côté école), dernier message (aperçu), nombre de messages non lus, côté de l'utilisateur et droit de répondre.
 *
 * @property-read ConversationSummary $resource
 */
final class ConversationResource extends JsonResource
{
    /**
     * @return array{id: string, channel: string, subject: string, student: array{id: string, full_name: string, first_name: string}, classroom: array{id: string, name: string}, guardian: array{id: string, name: string, phone: string|null}, last_message: array{side: string, author_name: string, preview: string, sent_at: string}|null, last_message_at: string, unread: int, side: string, can_write: bool}
     */
    public function toArray(Request $request): array
    {
        $summary = $this->resource;
        $conversation = $summary->conversation;
        $last = $summary->last;

        return [
            'id' => $conversation->id,
            'channel' => $conversation->channel->value,
            'subject' => $conversation->subject,
            'student' => [
                'id' => $conversation->student->id,
                'full_name' => $conversation->student->fullName(),
                'first_name' => $conversation->student->first_name,
            ],
            'classroom' => ['id' => $conversation->classroom->id, 'name' => $conversation->classroom->name()],
            'guardian' => [
                'id' => $conversation->guardian->id,
                'name' => $conversation->guardian->name,
                'phone' => $summary->side === MessageSide::School ? $conversation->guardian->phone : null,
            ],
            'last_message' => $last === null ? null : [
                'side' => $last->side->value,
                'author_name' => $last->author_name,
                'preview' => Str::limit($last->body, 140),
                'sent_at' => $last->sent_at->toIso8601String(),
            ],
            'last_message_at' => $conversation->last_message_at->toIso8601String(),
            'unread' => $summary->unread,
            'side' => $summary->side->value,
            'can_write' => $summary->canWrite,
        ];
    }
}
