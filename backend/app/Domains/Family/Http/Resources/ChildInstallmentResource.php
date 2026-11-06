<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Échéance de la facture : date, libellé, montant et part réglée (FCFA).
 *
 * @property-read array{due_on: string, label: string, amount: int, settled: int} $resource
 */
final class ChildInstallmentResource extends JsonResource
{
    /**
     * @return array{due_on: string, label: string, amount: int, settled: int}
     */
    public function toArray(Request $request): array
    {
        return [
            'due_on' => (string) $this->resource['due_on'],
            'label' => (string) $this->resource['label'],
            'amount' => (int) $this->resource['amount'],
            'settled' => (int) $this->resource['settled'],
        ];
    }
}
