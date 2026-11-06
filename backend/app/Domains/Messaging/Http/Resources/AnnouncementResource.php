<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Http\Resources;

use App\Domains\Messaging\Data\AnnouncementView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Annonce : titre, texte, public (school, cycle, classroom avec le cycle ou la classe), auteur, date, élèves
 * concernés (`reach`) et droit de la retirer (`can_delete`).
 *
 * @property-read AnnouncementView $resource
 */
final class AnnouncementResource extends JsonResource
{
    /**
     * @return array{id: string, title: string, body: string, audience: string, cycle: array{id: string, code: string, name: string}|null, classroom: array{id: string, name: string}|null, author_name: string, published_at: string, reach: int, can_delete: bool}
     */
    public function toArray(Request $request): array
    {
        $announcement = $this->resource->announcement;
        $cycle = $announcement->cycle;
        $classroom = $announcement->classroom;

        return [
            'id' => $announcement->id,
            'title' => $announcement->title,
            'body' => $announcement->body,
            'audience' => $announcement->audience->value,
            'cycle' => $cycle === null ? null : ['id' => $cycle->id, 'code' => $cycle->code, 'name' => $cycle->name],
            'classroom' => $classroom === null ? null : ['id' => $classroom->id, 'name' => $classroom->name()],
            'author_name' => $announcement->author_name,
            'published_at' => $announcement->published_at->toIso8601String(),
            'reach' => $announcement->reach,
            'can_delete' => $this->resource->canDelete,
        ];
    }
}
