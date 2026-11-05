<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Enums\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Totaux d'une caisse pour un moyen de paiement (FCFA) : encaissé, annulé, remboursé, net, nombre d'encaissements.
 *
 * @property-read array{method: PaymentMethod, collected: int, cancelled: int, refunded: int, net: int, count: int} $resource
 */
final class CashMethodTotalResource extends JsonResource
{
    /**
     * @return array{method: string, collected: int, cancelled: int, refunded: int, net: int, count: int}
     */
    public function toArray(Request $request): array
    {
        $row = $this->resource;

        return [
            'method' => $row['method']->value,
            'collected' => (int) $row['collected'],
            'cancelled' => (int) $row['cancelled'],
            'refunded' => (int) $row['refunded'],
            'net' => (int) $row['net'],
            'count' => (int) $row['count'],
        ];
    }
}
