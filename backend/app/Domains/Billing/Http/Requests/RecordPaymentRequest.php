<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Enums\PaymentMethod;
use Illuminate\Validation\Rule;

/**
 * Encaissement (billing.manage sur le cycle) : montant en FCFA entiers, moyen de paiement, référence obligatoire hors
 * espèces (opérateur Mobile Money, chèque, virement).
 */
final class RecordPaymentRequest extends InvoiceRequest
{
    protected string $ability = 'collect';

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'reference' => ['nullable', 'required_unless:method,cash', 'string', 'min:3', 'max:60'],
        ];
    }

    public function paymentMethod(): PaymentMethod
    {
        return PaymentMethod::from($this->string('method')->toString());
    }

    public function reference(): ?string
    {
        $reference = trim($this->string('reference')->toString());

        return $reference === '' ? null : $reference;
    }
}
