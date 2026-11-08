<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Enums\LineKind;
use App\Domains\Billing\Models\InvoiceLine;
use App\Domains\Identity\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use LogicException;

/** Retirer une ligne manuelle (billing.manage) ou une remise (billing.discount) ; ligne d'une autre facture : 404. */
final class RemoveInvoiceLineRequest extends InvoiceRequest
{
    public function authorize(): bool
    {
        if ($this->line()->invoice_id !== $this->invoice()->id) {
            throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
        }

        $this->ability = $this->line()->kind === LineKind::Discount ? 'discount' : 'manage';

        return parent::authorize();
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }

    public function line(): InvoiceLine
    {
        $line = $this->route('line');

        return $line instanceof InvoiceLine ? $line : throw new LogicException('Ligne de la route introuvable.');
    }

    public function author(): User
    {
        $user = $this->user();

        return $user instanceof User ? $user : throw new LogicException('Utilisateur absent.');
    }
}
