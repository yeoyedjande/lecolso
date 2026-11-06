<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\PersonPhoto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Élève dans une grille de notes : nom et photo (URL signée de 10 minutes).
 *
 * @property-read Student $resource
 */
final class GradingStudentResource extends JsonResource
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
            'photo_url' => $student->photo_path === null ? null : app(PersonPhoto::class)->url($student->photo_path),
        ];
    }
}
