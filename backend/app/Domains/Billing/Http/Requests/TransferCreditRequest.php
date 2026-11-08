<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Models\Invoice;
use App\Domains\Identity\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Report d'un trop-perçu (direction : billing.refund sur la facture d'origine) vers une autre facture du même payeur,
 * que l'utilisateur peut modifier (billing.manage sur son cycle) ; sinon 422, comme une facture inexistante.
 */
final class TransferCreditRequest extends InvoiceRequest
{
    protected string $ability = 'refund';

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'to_invoice_id' => ['required', 'uuid'],
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'reason' => ['required', 'string', 'min:3', 'max:200'],
        ];
    }

    /**
     * @throws ValidationException facture inconnue ou hors des droits de l'utilisateur
     */
    public function target(): Invoice
    {
        // Lecture sous la RLS de l'école courante : une facture d'une autre école est introuvable
        $target = Invoice::query()->find($this->string('to_invoice_id')->toString());
        $user = $this->user();

        if (! $target instanceof Invoice || ! $user instanceof User || ! $user->can('manage', $target)) {
            throw ValidationException::withMessages(['to_invoice_id' => 'Facture introuvable.']);
        }

        return $target;
    }
}
