<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Level;
use Illuminate\Foundation\Http\FormRequest;
use LogicException;

/**
 * Matières d'un niveau : `academic_year_id`, `subjects` dans l'ordre (`id` d'une matière existante ou rien,
 * `name`, `coefficient` de 1 à 20). school.settings.manage sur le cycle, contrôlé par l'Action.
 */
final class SaveSubjectsRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'academic_year_id' => ['required', 'uuid'],
            'subjects' => ['required', 'array', 'min:1', 'max:30'],
            'subjects.*.id' => ['nullable', 'uuid', 'distinct'],
            'subjects.*.name' => ['required', 'string', 'min:2', 'max:80'],
            'subjects.*.coefficient' => ['required', 'integer', 'min:1', 'max:20'],
        ];
    }

    public function level(): Level
    {
        $level = $this->route('level');

        return $level instanceof Level ? $level : throw new LogicException('Niveau de la route introuvable.');
    }

    public function year(): AcademicYear
    {
        return SettingsYear::resolve($this->input('academic_year_id'), true);
    }

    /**
     * @return list<array{id: string|null, name: string, coefficient: int}>
     */
    public function subjects(): array
    {
        $subjects = [];
        foreach ((array) $this->validated('subjects') as $subject) {
            if (is_array($subject)) {
                $id = AssessmentRules::text($subject, 'id');
                $subjects[] = [
                    'id' => $id === '' ? null : $id,
                    'name' => trim(AssessmentRules::text($subject, 'name')),
                    'coefficient' => is_numeric($subject['coefficient'] ?? null) ? (int) $subject['coefficient'] : 1,
                ];
            }
        }

        return $subjects;
    }
}
