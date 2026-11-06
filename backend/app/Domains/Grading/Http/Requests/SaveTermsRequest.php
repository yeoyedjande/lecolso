<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Cycle;
use Illuminate\Foundation\Http\FormRequest;
use LogicException;

/**
 * Périodes d'un cycle : `academic_year_id`, `terms` dans l'ordre (libellé, début, fin), autant que le veut le type
 * de période du cycle. school.settings.manage sur le cycle, contrôlé par l'Action.
 */
final class SaveTermsRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'academic_year_id' => ['required', 'uuid'],
            'terms' => ['required', 'array', 'min:1', 'max:6'],
            'terms.*.label' => ['required', 'string', 'min:2', 'max:60'],
            'terms.*.starts_on' => ['required', 'date_format:Y-m-d'],
            'terms.*.ends_on' => ['required', 'date_format:Y-m-d'],
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
     * @return list<array{label: string, starts_on: string, ends_on: string}>
     */
    public function terms(): array
    {
        $terms = [];
        foreach ((array) $this->validated('terms') as $term) {
            if (is_array($term)) {
                $terms[] = [
                    'label' => trim(AssessmentRules::text($term, 'label')),
                    'starts_on' => AssessmentRules::text($term, 'starts_on'),
                    'ends_on' => AssessmentRules::text($term, 'ends_on'),
                ];
            }
        }

        return $terms;
    }
}
