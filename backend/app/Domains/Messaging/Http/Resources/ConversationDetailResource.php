<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Http\Resources;

use App\Domains\Messaging\Data\ConversationView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Fil complet : son résumé (`conversation`) et ses messages, du plus ancien au plus récent.
 *
 * @property-read ConversationView $resource
 */
final class ConversationDetailResource extends JsonResource
{
    /**
     * @return array{conversation: ConversationResource, messages: AnonymousResourceCollection<MessageResource>}
     */
    public function toArray(Request $request): array
    {
        return [
            'conversation' => new ConversationResource($this->resource->summary),
            'messages' => MessageResource::collection($this->resource->messages),
        ];
    }
}
