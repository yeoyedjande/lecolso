<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\Level;
use App\Support\Http\BusinessConflict;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Montants annuels de la grille (FCFA, entiers, 0 = pas de frais) : billing.manage sur le cycle de chaque niveau.
 * Année clôturée : 409 `year_closed`.
 */
final class SaveFeeGridRequest extends FormRequest
{
    use BillingYearRequest;

    public function authorize(): bool
    {
        $manageable = $this->cyclesFor('billing.manage');
        if ($manageable === []) {
            return false;
        }

        $levelIds = array_values(array_filter(array_map(
            static fn (mixed $entry): mixed => is_array($entry) ? ($entry['level_id'] ?? null) : null,
            (array) $this->input('amounts', []),
        ), 'is_string'));

        return $manageable === null || Level::query()->whereIn('id', $levelIds)->whereNotIn('cycle_id', $manageable)->doesntExist();
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'academic_year_id' => ['nullable', 'uuid'],
            'amounts' => ['required', 'array', 'min:1', 'max:500'],
            'amounts.*.level_id' => ['required', 'uuid', 'exists:levels,id'],
            'amounts.*.fee_type_id' => ['required', 'uuid', 'exists:fee_types,id'],
            'amounts.*.amount' => ['required', 'integer', 'min:0', 'max:100000000'],
        ];
    }

    /**
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (): void {
                if ($this->year()->status === AcademicYearStatus::Closed) {
                    throw new BusinessConflict('year_closed', 'Cette année scolaire est clôturée : sa grille ne change plus.');
                }
            },
        ];
    }

    /**
     * @return list<array{level_id: string, fee_type_id: string, amount: int}>
     */
    public function amounts(): array
    {
        /** @var list<array{level_id: string, fee_type_id: string, amount: int|string}> $amounts */
        $amounts = $this->validated('amounts');

        return array_map(static fn (array $entry): array => [
            'level_id' => $entry['level_id'],
            'fee_type_id' => $entry['fee_type_id'],
            'amount' => (int) $entry['amount'],
        ], $amounts);
    }
}
