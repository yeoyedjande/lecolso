<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Models\FeeType;
use LogicException;

/** Retirer un service optionnel : les périodes qui n'ont pas commencé ne sont plus facturées. */
final class RemoveOptionRequest extends InvoiceRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }

    public function feeType(): FeeType
    {
        $type = $this->route('feeType');

        return $type instanceof FeeType ? $type : throw new LogicException('Service de la route introuvable.');
    }
}
