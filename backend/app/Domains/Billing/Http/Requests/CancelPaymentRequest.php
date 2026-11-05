<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

/** Annulation d'un paiement (direction : billing.cancel sur le cycle) : motif obligatoire. */
final class CancelPaymentRequest extends PaymentRequest
{
    protected string $ability = 'cancel';

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['reason' => ['required', 'string', 'min:3', 'max:200']];
    }
}
