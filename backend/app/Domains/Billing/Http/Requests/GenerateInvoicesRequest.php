<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Factures des élèves déjà inscrits sans facture : billing.manage, dans la limite de ses cycles. */
final class GenerateInvoicesRequest extends FormRequest
{
    use BillingYearRequest;

    public function authorize(): bool
    {
        return $this->cyclesFor('billing.manage') !== [];
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['academic_year_id' => ['nullable', 'uuid']];
    }

    /**
     * @return list<string>|null
     */
    public function cycles(): ?array
    {
        return $this->cyclesFor('billing.manage');
    }
}
