<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Students\Data\StudentFilters;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Models\Student;
use Illuminate\Foundation\Http\FormRequest;

final class ListStudentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', Student::class) === true;
    }

    /**
     * Filtres : `academic_year_id` (année en cours par défaut), `classroom_id`, `cycle_id`, `status` (`active` par
     * défaut, `left`, `all`), `search` (nom, prénom, matricule, nom ou au moins 4 chiffres du téléphone d'un tuteur) ;
     * `cursor` pour la page suivante.
     *
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'academic_year_id' => ['nullable', 'uuid'],
            'classroom_id' => ['nullable', 'uuid'],
            'cycle_id' => ['nullable', 'uuid'],
            'status' => ['nullable', 'in:active,left,all'],
            'search' => ['nullable', 'string', 'max:100'],
            'cursor' => ['nullable', 'string'],
        ];
    }

    public function filters(): StudentFilters
    {
        $value = fn (string $key): ?string => $this->filled($key) ? trim($this->string($key)->toString()) : null;

        return new StudentFilters(
            academicYearId: $value('academic_year_id'),
            classroomId: $value('classroom_id'),
            cycleId: $value('cycle_id'),
            status: match ($value('status')) {
                'all' => null,
                'left' => EnrollmentStatus::Left,
                default => EnrollmentStatus::Active,
            },
            search: $value('search'),
        );
    }
}
