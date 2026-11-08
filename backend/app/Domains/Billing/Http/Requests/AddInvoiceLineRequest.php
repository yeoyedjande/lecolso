<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use Illuminate\Support\Carbon;

/** Ligne ajoutée à la main : libellé, montant (FCFA, entier) et date d'échéance (aujourd'hui par défaut). */
final class AddInvoiceLineRequest extends InvoiceRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'min:2', 'max:120'],
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'due_on' => ['sometimes', 'date_format:Y-m-d'],
        ];
    }

    public function dueOn(): Carbon
    {
        return $this->filled('due_on') ? Carbon::parse($this->string('due_on')->toString()) : Carbon::today();
    }
}
