<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Resources;

use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\PersonPhoto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Enfant de l'espace parent : nom, photo (URL signée de 10 minutes) et classe de l'année.
 *
 * @property-read array{student: Student, enrollment: Enrollment|null} $resource
 */
final class ChildStudentResource extends JsonResource
{
    /**
     * @return array{id: string, full_name: string, first_name: string, matricule: string, photo_url: string|null, classroom: array{id: string, name: string}|null, cycle: array{code: string, name: string}|null}
     */
    public function toArray(Request $request): array
    {
        $student = $this->resource['student'];
        $enrollment = $this->resource['enrollment'];
        $classroom = $enrollment?->classroom;

        return [
            'id' => $student->id,
            'full_name' => $student->fullName(),
            'first_name' => $student->first_name,
            'matricule' => $student->matricule,
            'photo_url' => $student->photo_path === null ? null : app(PersonPhoto::class)->url($student->photo_path),
            'classroom' => $classroom === null ? null : ['id' => $classroom->id, 'name' => $classroom->name()],
            'cycle' => $classroom === null ? null : ['code' => $classroom->level->cycle->code, 'name' => $classroom->level->cycle->name],
        ];
    }
}
