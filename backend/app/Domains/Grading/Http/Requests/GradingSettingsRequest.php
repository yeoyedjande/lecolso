<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Réglages des notes d'un cycle : `cycle_id`, `academic_year_id` (année en cours par défaut). Personnel avec
 * school.settings.view sur le cycle (403 sinon).
 */
final class GradingSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && app(GradingAccess::class)->canViewSettings($user, $this->cycle()->id);
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'cycle_id' => ['required', 'uuid'],
            'academic_year_id' => ['nullable', 'uuid'],
        ];
    }

    public function cycle(): Cycle
    {
        $id = $this->query('cycle_id');
        $cycle = is_string($id) && Str::isUuid($id) ? Cycle::query()->find($id) : null;

        return $cycle ?? throw ValidationException::withMessages(['cycle_id' => 'Cycle inconnu.']);
    }

    public function year(): AcademicYear
    {
        return SettingsYear::resolve($this->query('academic_year_id'), false);
    }
}
