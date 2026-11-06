<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

use App\Domains\Grading\Enums\SkillLevel;

/** Champs d'une évaluation, communs à l'API et à la file hors connexion. */
final class AssessmentRules
{
    /**
     * @return array<string, list<string>>
     */
    public static function rules(): array
    {
        return [
            'subject_id' => ['required', 'uuid'],
            'term_id' => ['required', 'uuid'],
            'title' => ['required', 'string', 'min:2', 'max:80'],
            'date' => ['required', 'date_format:Y-m-d'],
            'out_of' => ['required', 'integer', 'min:1', 'max:100'],
        ];
    }

    /**
     * @param  array<array-key, mixed>  $data
     * @return array{subject_id: string, term_id: string, title: string, date: string, out_of: int}
     */
    public static function data(array $data): array
    {
        return [
            'subject_id' => self::text($data, 'subject_id'),
            'term_id' => self::text($data, 'term_id'),
            'title' => trim(self::text($data, 'title')),
            'date' => self::text($data, 'date'),
            'out_of' => is_numeric($data['out_of'] ?? null) ? (int) $data['out_of'] : 0,
        ];
    }

    /**
     * @return array<string, list<string>>
     */
    public static function gradeRules(): array
    {
        return [
            'grades' => ['present', 'array', 'max:200'],
            'grades.*.student_id' => ['required', 'uuid', 'distinct'],
            'grades.*.value' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:100'],
            'grades.*.absent' => ['required', 'boolean'],
            'recorded_at' => ['nullable', 'date'],
        ];
    }

    /**
     * @param  array<array-key, mixed>  $data
     * @return list<array{student_id: string, value: float|null, absent: bool}>
     */
    public static function grades(array $data): array
    {
        $grades = [];
        foreach (is_array($data['grades'] ?? null) ? $data['grades'] : [] as $grade) {
            if (! is_array($grade) || ! is_string($grade['student_id'] ?? null)) {
                continue;
            }
            $grades[] = [
                'student_id' => $grade['student_id'],
                'value' => is_numeric($grade['value'] ?? null) ? (float) $grade['value'] : null,
                'absent' => filter_var($grade['absent'] ?? false, FILTER_VALIDATE_BOOLEAN),
            ];
        }

        return $grades;
    }

    /**
     * @return array<string, list<string>>
     */
    public static function skillRules(): array
    {
        return [
            'term_id' => ['required', 'uuid'],
            'evaluations' => ['present', 'array', 'max:2000'],
            'evaluations.*.student_id' => ['required', 'uuid'],
            'evaluations.*.skill_id' => ['required', 'uuid'],
            'evaluations.*.level' => ['nullable', 'in:A,EA,NA'],
            'recorded_at' => ['nullable', 'date'],
        ];
    }

    /**
     * @param  array<array-key, mixed>  $data
     * @return list<array{student_id: string, skill_id: string, level: SkillLevel|null}>
     */
    public static function evaluations(array $data): array
    {
        $evaluations = [];
        foreach (is_array($data['evaluations'] ?? null) ? $data['evaluations'] : [] as $evaluation) {
            if (! is_array($evaluation) || ! is_string($evaluation['student_id'] ?? null) || ! is_string($evaluation['skill_id'] ?? null)) {
                continue;
            }
            $evaluations[] = [
                'student_id' => $evaluation['student_id'],
                'skill_id' => $evaluation['skill_id'],
                'level' => is_string($evaluation['level'] ?? null) ? SkillLevel::from($evaluation['level']) : null,
            ];
        }

        return $evaluations;
    }

    /**
     * @param  array<array-key, mixed>  $data
     */
    public static function text(array $data, string $key): string
    {
        $value = $data[$key] ?? null;

        return is_string($value) ? $value : '';
    }
}
