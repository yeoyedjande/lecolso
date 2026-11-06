<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Resources;

use App\Domains\Billing\Support\InvoiceBalance;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Situation de la facture de l'année (FCFA) : total, réglé, reste, retard, prochaine échéance et échéancier.
 *
 * @property-read InvoiceBalance $resource
 */
final class ChildBalanceResource extends JsonResource
{
    /**
     * @return array{total: int, settled: int, remaining: int, overdue: int, next: array{due_on: string, label: string, amount: int}|null, schedule: AnonymousResourceCollection}
     */
    public function toArray(Request $request): array
    {
        $balance = $this->resource;
        $next = $balance->next;

        return [
            'total' => $balance->total,
            'settled' => $balance->settled,
            'remaining' => $balance->remaining,
            'overdue' => $balance->overdue,
            'next' => $next === null ? null : ['due_on' => (string) $next['due_on'], 'label' => (string) $next['label'], 'amount' => (int) $next['amount']],
            'schedule' => ChildInstallmentResource::collection($balance->schedule),
        ];
    }
}
