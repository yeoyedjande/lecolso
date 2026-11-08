<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Lecture de la facturation d'une année (grille, échéanciers) : billing.view sur au moins un cycle. */
final class ShowBillingGridRequest extends FormRequest
{
    use BillingYearRequest;

    public function authorize(): bool
    {
        return $this->cyclesFor('billing.view') !== [];
    }

    /**
     * `academic_year_id` : année (en cours par défaut).
     *
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['academic_year_id' => ['nullable', 'uuid']];
    }
}
