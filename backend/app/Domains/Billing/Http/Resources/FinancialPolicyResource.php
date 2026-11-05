<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Enums\DeparturePolicy;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Politique financière de l'école. `departure` : cancel_unstarted (échéances des périodes non commencées annulées au
 * départ, par défaut) ou keep_all (toutes les échéances restent dues).
 *
 * @property-read DeparturePolicy $resource
 */
final class FinancialPolicyResource extends JsonResource
{
    /**
     * @return array{departure: string}
     */
    public function toArray(Request $request): array
    {
        return ['departure' => $this->resource->value];
    }
}
