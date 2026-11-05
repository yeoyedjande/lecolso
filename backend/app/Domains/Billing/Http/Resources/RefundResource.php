<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Models\Refund;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Remboursement d'un trop-perçu (FCFA), avec son numéro, son motif et son auteur.
 *
 * @property-read Refund $resource
 */
final class RefundResource extends JsonResource
{
    /**
     * @return array{id: string, number: string, refunded_at: string, amount: int, method: string, reference: string|null, reason: string, refunded_by_name: string}
     */
    public function toArray(Request $request): array
    {
        $refund = $this->resource;

        return [
            'id' => $refund->id,
            'number' => $refund->number,
            'refunded_at' => $refund->created_at->toIso8601String(),
            'amount' => (int) $refund->amount,
            'method' => $refund->method->value,
            'reference' => $refund->reference,
            'reason' => $refund->reason,
            'refunded_by_name' => $refund->refunded_by_name,
        ];
    }
}
