<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Models\CreditTransfer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Report de trop-perçu vu depuis une facture : `direction` out (envoyé vers une autre facture) ou in (reçu),
 * avec l'élève et l'année de l'autre facture.
 *
 * @property-read array{transfer: CreditTransfer, direction: string} $resource
 */
final class CreditTransferResource extends JsonResource
{
    /**
     * @return array{id: string, direction: string, transferred_at: string, amount: int, reason: string, created_by_name: string, other_student_name: string, other_year_label: string}
     */
    public function toArray(Request $request): array
    {
        $transfer = $this->resource['transfer'];
        $other = $this->resource['direction'] === 'out' ? $transfer->toInvoice : $transfer->fromInvoice;

        return [
            'id' => $transfer->id,
            'direction' => $this->resource['direction'],
            'transferred_at' => $transfer->created_at->toIso8601String(),
            'amount' => (int) $transfer->amount,
            'reason' => $transfer->reason,
            'created_by_name' => $transfer->created_by_name,
            'other_student_name' => $other->studentRecord->fullName(),
            'other_year_label' => $other->academicYear->label,
        ];
    }
}
