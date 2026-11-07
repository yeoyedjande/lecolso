<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Identity\Models\User;
use App\Domains\Students\Actions\ImportStudents;
use App\Domains\Students\Data\ImportRow;
use App\Domains\Students\Models\Student;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Import Excel : `dry_run` (vérifier sans rien écrire) et `rows` (500 au plus), lignes lues par le navigateur. Les
 * valeurs sont vérifiées ligne par ligne par l'import (erreurs renvoyées par ligne, pas en 422) ; seule la forme est
 * contrôlée ici. Droit : students.manage sur au moins un cycle (chaque ligne : sur le cycle de sa classe).
 */
final class ImportStudentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->can('create', Student::class);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'dry_run' => ['required', 'boolean'],
            'rows' => ['required', 'array', 'min:1', 'max:'.ImportStudents::MAX_ROWS],
            'rows.*.line' => ['required', 'integer', 'min:1', 'max:100000'],
            'rows.*.last_name' => ['present', 'nullable', 'string', 'max:80'],
            'rows.*.first_name' => ['present', 'nullable', 'string', 'max:80'],
            'rows.*.gender' => ['present', 'nullable', 'string', 'max:20'],
            'rows.*.birth_date' => ['present', 'nullable', 'string', 'max:20'],
            'rows.*.classroom' => ['present', 'nullable', 'string', 'max:40'],
            'rows.*.address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'rows.*.guardian_name' => ['present', 'nullable', 'string', 'max:120'],
            'rows.*.guardian_relation' => ['sometimes', 'nullable', 'string', 'max:20'],
            'rows.*.guardian_phone' => ['present', 'nullable', 'string', 'max:30'],
        ];
    }

    /**
     * @return list<ImportRow>
     */
    public function importRows(): array
    {
        $rows = $this->validated('rows');
        if (! is_array($rows)) {
            return [];
        }
        $text = static fn (array $row, string $key): string => is_string($row[$key] ?? null) ? $row[$key] : '';

        return array_values(array_map(static fn (array $row): ImportRow => new ImportRow(
            line: is_numeric($row['line'] ?? null) ? (int) $row['line'] : 0,
            lastName: $text($row, 'last_name'),
            firstName: $text($row, 'first_name'),
            gender: $text($row, 'gender'),
            birthDate: $text($row, 'birth_date'),
            classroom: $text($row, 'classroom'),
            address: $text($row, 'address'),
            guardianName: $text($row, 'guardian_name'),
            guardianRelation: $text($row, 'guardian_relation'),
            guardianPhone: $text($row, 'guardian_phone'),
        ), array_filter($rows, 'is_array')));
    }
}
