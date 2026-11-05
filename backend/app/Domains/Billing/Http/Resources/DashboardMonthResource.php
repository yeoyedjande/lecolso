<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Encaissé net d'un mois (AAAA-MM), en FCFA.
 *
 * @property-read array{month: string, collected: int} $resource
 */
final class DashboardMonthResource extends JsonResource
{
    /**
     * @return array{month: string, collected: int}
     */
    public function toArray(Request $request): array
    {
        return ['month' => (string) $this->resource['month'], 'collected' => (int) $this->resource['collected']];
    }
}
