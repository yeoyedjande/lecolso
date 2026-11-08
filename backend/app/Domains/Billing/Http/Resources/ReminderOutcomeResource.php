<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Data\ReminderOutcome;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Résultat d'une relance : nombre de SMS mis en file (un par payeur) et de payeurs écartés — relancés depuis moins de
 * 7 jours (`recent`), sans téléphone (`no_phone`), plus en retard (`not_overdue`).
 *
 * @property-read ReminderOutcome $resource
 */
final class ReminderOutcomeResource extends JsonResource
{
    /**
     * @return array{queued: int, recent: int, no_phone: int, not_overdue: int}
     */
    public function toArray(Request $request): array
    {
        return [
            'queued' => (int) $this->resource->queued,
            'recent' => (int) $this->resource->recent,
            'no_phone' => (int) $this->resource->noPhone,
            'not_overdue' => (int) $this->resource->notOverdue,
        ];
    }
}
