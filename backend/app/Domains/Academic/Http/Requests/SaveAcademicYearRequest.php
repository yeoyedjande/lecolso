<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Requests;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\AcademicYear;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Création (POST : libellé et dates obligatoires) ou modification (PATCH : champs envoyés seulement). */
final class SaveAcademicYearRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage', AcademicYear::class) === true;
    }

    /**
     * `label` : « 2026-2027 » (deux années qui se suivent).
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'label' => [$required, 'string', 'regex:/^\d{4}-\d{4}$/', static function (string $attribute, mixed $value, Closure $fail): void {
                if (is_string($value) && preg_match('/^(\d{4})-(\d{4})$/', $value, $years) === 1 && (int) $years[2] !== (int) $years[1] + 1) {
                    $fail('Indiquez deux années qui se suivent, par exemple 2026-2027.');
                }
            }],
            'starts_on' => [$required, 'date_format:Y-m-d'],
            'ends_on' => [$required, 'date_format:Y-m-d'],
            'status' => ['sometimes', Rule::enum(AcademicYearStatus::class)],
            'is_current' => ['sometimes', 'boolean'],
        ];
    }

    public function year(): ?AcademicYear
    {
        $year = $this->route('academicYear');

        return $year instanceof AcademicYear ? $year : null;
    }

    /**
     * @return array{label?: string, starts_on?: string, ends_on?: string, status?: AcademicYearStatus, is_current?: bool}
     */
    public function yearAttributes(): array
    {
        $attributes = [];

        foreach (['label', 'starts_on', 'ends_on'] as $field) {
            if ($this->has($field)) {
                $attributes[$field] = $this->string($field)->toString();
            }
        }

        if ($this->has('status')) {
            $attributes['status'] = AcademicYearStatus::from($this->string('status')->toString());
        }

        if ($this->has('is_current')) {
            $attributes['is_current'] = $this->boolean('is_current');
        }

        return $attributes;
    }
}
