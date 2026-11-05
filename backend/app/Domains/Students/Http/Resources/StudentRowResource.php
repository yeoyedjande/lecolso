<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Resources;

use App\Domains\Students\Models\GuardianLink;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\PersonPhoto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Ligne de la liste des élèves : identité, inscription de l'année demandée, contact principal. Aucune donnée médicale.
 *
 * @property-read Student $resource
 */
final class StudentRowResource extends JsonResource
{
    /**
     * @return array{id: string, matricule: string, first_name: string, last_name: string, full_name: string, gender: string, birth_date: string, photo_url: string|null, enrollment: array{id: string, status: string, classroom_id: string, classroom_name: string, cycle_id: string, cycle_code: string}|null, primary_contact: array{name: string, phone: string}|null}
     */
    public function toArray(Request $request): array
    {
        $student = $this->resource;
        $enrollment = $student->enrollments->first();
        $contact = $student->guardianLinks->first(static fn (GuardianLink $link): bool => $link->is_primary_contact)
            ?? $student->guardianLinks->first();

        return [
            'id' => $student->id,
            'matricule' => $student->matricule,
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'full_name' => $student->fullName(),
            'gender' => $student->gender->value,
            'birth_date' => $student->birth_date->toDateString(),
            'photo_url' => app(PersonPhoto::class)->url($student->photo_path),
            'enrollment' => $enrollment === null ? null : [
                'id' => $enrollment->id,
                'status' => $enrollment->status->value,
                'classroom_id' => $enrollment->classroom_id,
                'classroom_name' => $enrollment->classroom->name(),
                'cycle_id' => $enrollment->classroom->level->cycle_id,
                'cycle_code' => $enrollment->classroom->level->cycle->code,
            ],
            'primary_contact' => $contact === null ? null : [
                'name' => $contact->guardian->name,
                'phone' => $contact->guardian->phone,
            ],
        ];
    }
}
