<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Requests;

use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Absences : qui voit au moins une classe (titulaire ou personnel). `date` (AAAA-MM-JJ, aujourd'hui par défaut),
 * ou `pending=1` : justifications à traiter, tous jours.
 */
final class AbsencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && app(AttendanceAccess::class)->classrooms($user)->isNotEmpty();
    }

    /** `pending=true` ou `false` (query string d'un navigateur) : lu comme booléen. */
    protected function prepareForValidation(): void
    {
        $pending = $this->query('pending');
        if (is_string($pending) && in_array(strtolower($pending), ['true', 'false'], true)) {
            $this->merge(['pending' => strtolower($pending) === 'true' ? '1' : '0']);
        }
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'date' => ['nullable', 'date_format:Y-m-d'],
            'pending' => ['nullable', 'boolean'],
        ];
    }
}
