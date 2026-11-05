<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Présences du tableau de bord (classes qui font l'appel) : absents et retards du jour, appels pas encore faits,
 * taux de présence des 10 derniers jours d'appel (%).
 *
 * @property-read array{absent_today: int, late_today: int, roll_calls_missing: int, rates: list<array{date: string, rate: int}>} $resource
 */
final class DashboardAttendanceResource extends JsonResource
{
    /**
     * @return array{absent_today: int, late_today: int, roll_calls_missing: int, rates: AnonymousResourceCollection<DashboardRateResource>}
     */
    public function toArray(Request $request): array
    {
        $data = $this->resource;

        return [
            'absent_today' => (int) $data['absent_today'],
            'late_today' => (int) $data['late_today'],
            'roll_calls_missing' => (int) $data['roll_calls_missing'],
            'rates' => DashboardRateResource::collection($data['rates']),
        ];
    }
}
