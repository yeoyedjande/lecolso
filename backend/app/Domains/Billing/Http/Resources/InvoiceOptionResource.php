<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Models\FeeType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Service optionnel qu'on peut encore ajouter à une facture, avec son montant annuel dans la grille du niveau (FCFA).
 *
 * @property-read array{type: FeeType, amount: int} $resource
 */
final class InvoiceOptionResource extends JsonResource
{
    /**
     * @return array{fee_type_id: string, code: string, name: string, amount: int}
     */
    public function toArray(Request $request): array
    {
        $type = $this->resource['type'];

        return [
            'fee_type_id' => $type->id,
            'code' => $type->code,
            'name' => $type->name,
            'amount' => (int) $this->resource['amount'],
        ];
    }
}
