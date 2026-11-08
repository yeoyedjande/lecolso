<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Autre facture du même payeur vers laquelle reporter un trop-perçu, avec son reste dû (FCFA).
 *
 * @property-read array{invoice: Invoice, remaining: int} $resource
 */
final class CreditTargetResource extends JsonResource
{
    /**
     * @return array{invoice_id: string, student_name: string, academic_year_label: string, remaining: int}
     */
    public function toArray(Request $request): array
    {
        $invoice = $this->resource['invoice'];

        return [
            'invoice_id' => $invoice->id,
            'student_name' => $invoice->student->fullName(),
            'academic_year_label' => $invoice->academicYear->label,
            'remaining' => (int) $this->resource['remaining'],
        ];
    }
}
