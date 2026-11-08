<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Http\Resources;

use App\Domains\Messaging\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Message d'un fil : côté (guardian, school), auteur, texte, date, `mine` (écrit par l'utilisateur) et l'absence
 * annoncée qu'il accompagne, avec son statut.
 *
 * @property-read Message $resource
 */
final class MessageResource extends JsonResource
{
    /**
     * @return array{id: string, side: string, author_name: string, body: string, sent_at: string, mine: bool, planned_absence: array{id: string, starts_on: string, ends_on: string, status: string}|null}
     */
    public function toArray(Request $request): array
    {
        $message = $this->resource;
        $planned = $message->plannedAbsence;

        return [
            'id' => $message->id,
            'side' => $message->side->value,
            'author_name' => $message->author_name,
            'body' => $message->body,
            'sent_at' => $message->sent_at->toIso8601String(),
            'mine' => $message->author_id === $request->user()?->getAuthIdentifier(),
            'planned_absence' => $planned === null ? null : [
                'id' => $planned->id,
                'starts_on' => $planned->starts_on->toDateString(),
                'ends_on' => $planned->ends_on->toDateString(),
                'status' => $planned->status->value,
            ],
        ];
    }
}
