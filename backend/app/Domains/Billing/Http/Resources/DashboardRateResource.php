<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Taux de présence d'un jour d'appel (%).
 *
 * @property-read array{date: string, rate: int} $resource
 */
final class DashboardRateResource extends JsonResource
{
    /**
     * @return array{date: string, rate: int}
     */
    public function toArray(Request $request): array
    {
        return ['date' => (string) $this->resource['date'], 'rate' => (int) $this->resource['rate']];
    }
}
