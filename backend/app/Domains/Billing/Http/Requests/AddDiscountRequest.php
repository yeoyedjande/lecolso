<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

/** Remise (direction : billing.discount) : montant (FCFA, entier) et motif obligatoire. */
final class AddDiscountRequest extends InvoiceRequest
{
    protected string $ability = 'discount';

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'reason' => ['required', 'string', 'min:3', 'max:200'],
        ];
    }
}
