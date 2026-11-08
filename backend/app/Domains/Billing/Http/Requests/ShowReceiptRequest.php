<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

/** Reçu d'un paiement : qui voit la facture (personnel du cycle, parents de l'enfant). */
final class ShowReceiptRequest extends PaymentRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }
}
