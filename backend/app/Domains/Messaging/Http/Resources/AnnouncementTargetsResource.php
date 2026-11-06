<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Http\Resources;

use App\Domains\Messaging\Data\AnnouncementTargets;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Publics qu'un utilisateur peut viser : toute l'école (`school`), ses cycles, ses classes de l'année en cours.
 *
 * @property-read AnnouncementTargets $resource
 */
final class AnnouncementTargetsResource extends JsonResource
{
    /**
     * @return array{school: bool, cycles: list<array{id: string, code: string, name: string}>, classrooms: list<array{id: string, name: string, cycle_id: string}>}
     */
    public function toArray(Request $request): array
    {
        $cycles = [];
        foreach ($this->resource->cycles as $cycle) {
            $cycles[] = ['id' => $cycle->id, 'code' => $cycle->code, 'name' => $cycle->name];
        }
        $classrooms = [];
        foreach ($this->resource->classrooms as $classroom) {
            $classrooms[] = ['id' => $classroom->id, 'name' => $classroom->name(), 'cycle_id' => $classroom->level->cycle_id];
        }

        return ['school' => $this->resource->school === true, 'cycles' => $cycles, 'classrooms' => $classrooms];
    }
}
