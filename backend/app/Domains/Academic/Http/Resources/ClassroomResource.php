<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Resources;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Support\ClassroomSeats;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Une classe : `name` (« CE1 A »), niveau et cycle, titulaire (nom seulement), `can_manage` pour l'utilisateur connecté.
 *
 * @property-read Classroom $resource
 */
final class ClassroomResource extends JsonResource
{
    /**
     * @return array{id: string, academic_year_id: string, name: string, section: string, capacity: int|null, enrolled_count: int, room: string|null, level: array{id: string, code: string, name: string, cycle_id: string, cycle_code: string}, homeroom_teacher: array{id: string, name: string}|null, can_manage: bool}
     */
    public function toArray(Request $request): array
    {
        $classroom = $this->resource;
        $teacher = $classroom->homeroomTeacher;
        $user = $request->user();

        return [
            'id' => $classroom->id,
            'academic_year_id' => $classroom->academic_year_id,
            'name' => $classroom->name(),
            'section' => $classroom->section,
            'capacity' => $classroom->capacity,
            'enrolled_count' => $classroom->enrolled_count ?? ClassroomSeats::taken($classroom),
            'room' => $classroom->room,
            'level' => [
                'id' => $classroom->level->id,
                'code' => $classroom->level->code,
                'name' => $classroom->level->name,
                'cycle_id' => $classroom->level->cycle_id,
                'cycle_code' => $classroom->level->cycle->code,
            ],
            'homeroom_teacher' => $teacher === null ? null : ['id' => $teacher->id, 'name' => $teacher->name],
            'can_manage' => $user instanceof User && $user->can('update', $classroom),
        ];
    }
}
