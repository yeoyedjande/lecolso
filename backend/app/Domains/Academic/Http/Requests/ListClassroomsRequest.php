<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Requests;

use App\Domains\Academic\Models\Classroom;
use Illuminate\Foundation\Http\FormRequest;

final class ListClassroomsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', Classroom::class) === true;
    }

    /**
     * `academic_year_id` : année voulue (l'année en cours par défaut).
     *
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['academic_year_id' => ['nullable', 'uuid']];
    }

    public function academicYearId(): ?string
    {
        return $this->filled('academic_year_id') ? $this->string('academic_year_id')->toString() : null;
    }
}
