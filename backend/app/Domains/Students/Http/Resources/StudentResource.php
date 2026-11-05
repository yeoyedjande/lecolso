<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Resources;

use App\Domains\Students\Data\StudentFile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Dossier d'un élève. `medical` : null sans la permission students.medical.view (les champs ne sont pas envoyés),
 * sinon groupe sanguin, allergies et notes (null si non renseignés). `enrollments` : la plus récente d'abord.
 *
 * @property-read StudentFile $resource
 */
final class StudentResource extends JsonResource
{
    /**
     * @return array{id: string, matricule: string, first_name: string, last_name: string, full_name: string, gender: string, birth_date: string, birth_place: string|null, address: string|null, medical: array{blood_type: string|null, allergies: string|null, medical_notes: string|null}|null, guardians: AnonymousResourceCollection<GuardianLinkResource>, enrollments: AnonymousResourceCollection<EnrollmentResource>, siblings: AnonymousResourceCollection<SiblingResource>, can_manage: bool, can_view_medical: bool, created_at: string|null}
     */
    public function toArray(Request $request): array
    {
        $file = $this->resource;
        $student = $file->student;

        return [
            'id' => $student->id,
            'matricule' => $student->matricule,
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'full_name' => $student->fullName(),
            'gender' => $student->gender->value,
            'birth_date' => $student->birth_date->toDateString(),
            'birth_place' => $student->birth_place,
            'address' => $student->address,
            'medical' => $file->canViewMedical ? [
                'blood_type' => $student->blood_type?->value,
                'allergies' => $student->allergies,
                'medical_notes' => $student->medical_notes,
            ] : null,
            'guardians' => GuardianLinkResource::collection($student->guardianLinks),
            'enrollments' => EnrollmentResource::collection($student->enrollments),
            'siblings' => SiblingResource::collection($file->siblings),
            'can_manage' => $file->canManage,
            'can_view_medical' => $file->canViewMedical,
            'created_at' => $student->created_at?->toIso8601String(),
        ];
    }
}
