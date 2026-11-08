<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Resources;

use App\Domains\Academic\Data\SchoolEventView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Événement du calendrier : type (holiday, exam, meeting, event, training), dates, cycle (null : toute l'école), lieu,
 * droit de le modifier (`can_manage`).
 *
 * @property-read SchoolEventView $resource
 */
final class SchoolEventResource extends JsonResource
{
    /**
     * @return array{id: string, title: string, kind: string, starts_on: string, ends_on: string, cycle: array{id: string, code: string, name: string}|null, location: string|null, can_manage: bool}
     */
    public function toArray(Request $request): array
    {
        $event = $this->resource->event;
        $cycle = $event->cycle;

        return [
            'id' => $event->id,
            'title' => $event->title,
            'kind' => $event->kind->value,
            'starts_on' => $event->starts_on->toDateString(),
            'ends_on' => $event->ends_on->toDateString(),
            'cycle' => $cycle === null ? null : ['id' => $cycle->id, 'code' => $cycle->code, 'name' => $cycle->name],
            'location' => $event->location === null ? null : (string) $event->location,
            'can_manage' => $this->resource->canManage === true,
        ];
    }
}
