<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Models\FeeType;
use LogicException;

/** Ajouter un service optionnel (cantine, transport…) à partir d'aujourd'hui : échéances restantes seulement. */
final class AddOptionRequest extends InvoiceRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['fee_type_id' => ['required', 'uuid', 'exists:fee_types,id,is_optional,1']];
    }

    public function feeType(): FeeType
    {
        return FeeType::query()->find($this->string('fee_type_id')->toString()) ?? throw new LogicException('Service validé introuvable.');
    }
}
