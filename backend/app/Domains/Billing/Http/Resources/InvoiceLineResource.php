<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Models\InvoiceLine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Ligne d'une facture : frais de la grille, ligne manuelle ou remise (montant négatif, avec son motif). FCFA.
 *
 * @property-read InvoiceLine $resource
 */
final class InvoiceLineResource extends JsonResource
{
    /**
     * @return array{id: string, kind: string, fee_type_id: string|null, fee_type_code: string|null, is_optional: bool, label: string, amount: int, reason: string|null}
     */
    public function toArray(Request $request): array
    {
        $line = $this->resource;

        return [
            'id' => $line->id,
            'kind' => $line->kind->value,
            'fee_type_id' => $line->fee_type_id,
            'fee_type_code' => $line->feeType?->code,
            'is_optional' => $line->feeType?->is_optional === true,
            'label' => $line->label,
            'amount' => (int) $line->amount,
            'reason' => $line->reason,
        ];
    }
}
