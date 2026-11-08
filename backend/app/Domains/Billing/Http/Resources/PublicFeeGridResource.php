<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Data\PublicFeeGrid;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Tarifs publiés : année scolaire, types de frais (`optional` : service au choix, comme la cantine) et montants
 * annuels en FCFA par niveau (`amounts` : code du type → montant ; absent = non proposé à ce niveau).
 *
 * @property-read PublicFeeGrid $resource
 */
final class PublicFeeGridResource extends JsonResource
{
    /**
     * @return array{year_label: string, fee_types: list<array{code: string, name: string, optional: bool}>, levels: list<array{cycle_name: string, level_code: string, level_name: string, amounts: array<string, int>}>}
     */
    public function toArray(Request $request): array
    {
        return [
            'year_label' => $this->resource->yearLabel,
            'fee_types' => $this->resource->feeTypes,
            'levels' => $this->resource->levels,
        ];
    }
}
