<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\PersonPhoto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Élève dans un écran de présences : nom et photo (URL signée de 10 minutes).
 *
 * @property-read Student $resource
 */
final class AttendanceStudentResource extends JsonResource
{
    /**
     * @return array{id: string, full_name: string, first_name: string, matricule: string, photo_url: string|null}
     */
    public function toArray(Request $request): array
    {
        $student = $this->resource;

        return [
            'id' => $student->id,
            'full_name' => $student->fullName(),
            'first_name' => $student->first_name,
            'matricule' => $student->matricule,
            'photo_url' => app(PersonPhoto::class)->url($student->photo_path),
        ];
    }
}
