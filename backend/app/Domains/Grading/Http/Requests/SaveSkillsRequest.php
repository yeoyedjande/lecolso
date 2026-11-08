<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Cycle;
use Illuminate\Foundation\Http\FormRequest;
use LogicException;

/**
 * Référentiel de compétences d'un cycle : `academic_year_id`, `skills` dans l'ordre (`id` d'une compétence
 * existante ou rien, `domain`, `label`). school.settings.manage sur le cycle, contrôlé par l'Action.
 */
final class SaveSkillsRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'academic_year_id' => ['required', 'uuid'],
            'skills' => ['required', 'array', 'min:1', 'max:100'],
            'skills.*.id' => ['nullable', 'uuid', 'distinct'],
            'skills.*.domain' => ['required', 'string', 'min:2', 'max:80'],
            'skills.*.label' => ['required', 'string', 'min:2', 'max:160'],
        ];
    }

    public function cycle(): Cycle
    {
        $cycle = $this->route('cycle');

        return $cycle instanceof Cycle ? $cycle : throw new LogicException('Cycle de la route introuvable.');
    }

    public function year(): AcademicYear
    {
        return SettingsYear::resolve($this->input('academic_year_id'), true);
    }

    /**
     * @return list<array{id: string|null, domain: string, label: string}>
     */
    public function skills(): array
    {
        $skills = [];
        foreach ((array) $this->validated('skills') as $skill) {
            if (is_array($skill)) {
                $id = AssessmentRules::text($skill, 'id');
                $skills[] = [
                    'id' => $id === '' ? null : $id,
                    'domain' => trim(AssessmentRules::text($skill, 'domain')),
                    'label' => trim(AssessmentRules::text($skill, 'label')),
                ];
            }
        }

        return $skills;
    }
}
