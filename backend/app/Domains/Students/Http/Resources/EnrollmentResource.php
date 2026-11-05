<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Resources;

use App\Domains\Students\Models\Enrollment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Inscription d'un élève : année, classe (avec son niveau, son cycle et son titulaire), statut et départ éventuel.
 *
 * @property-read Enrollment $resource
 */
final class EnrollmentResource extends JsonResource
{
    /**
     * @return array{id: string, status: string, enrolled_on: string, left_on: string|null, leave_reason: string|null, academic_year: array{id: string, label: string, is_current: bool, status: string}, classroom: array{id: string, name: string, level_code: string, cycle_id: string, cycle_code: string, homeroom_teacher: string|null}}
     */
    public function toArray(Request $request): array
    {
        $enrollment = $this->resource;
        $classroom = $enrollment->classroom;

        return [
            'id' => $enrollment->id,
            'status' => $enrollment->status->value,
            'enrolled_on' => $enrollment->enrolled_on->toDateString(),
            'left_on' => $enrollment->left_on?->toDateString(),
            'leave_reason' => $enrollment->leave_reason,
            'academic_year' => [
                'id' => $enrollment->academicYear->id,
                'label' => $enrollment->academicYear->label,
                'is_current' => $enrollment->academicYear->is_current,
                'status' => $enrollment->academicYear->status->value,
            ],
            'classroom' => [
                'id' => $classroom->id,
                'name' => $classroom->name(),
                'level_code' => $classroom->level->code,
                'cycle_id' => $classroom->level->cycle_id,
                'cycle_code' => $classroom->level->cycle->code,
                'homeroom_teacher' => $classroom->homeroomTeacher?->name,
            ],
        ];
    }
}
