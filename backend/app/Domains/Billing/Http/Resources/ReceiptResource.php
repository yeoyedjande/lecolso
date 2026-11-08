<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Resources;

use App\Domains\Billing\Data\ReceiptView;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Reçu imprimable : paiement (numéro unique, montant en FCFA, moyen, référence, caissier, annulation éventuelle),
 * élève, classe, année, payeur, école émettrice (logo : URL signée de 30 minutes) et reste à payer à ce jour.
 *
 * @property-read ReceiptView $resource
 */
final class ReceiptResource extends JsonResource
{
    /**
     * @return array{payment: PaymentResource, student: array{id: string, full_name: string, matricule: string}, classroom_name: string, academic_year_label: string, remaining: int, school: array{name: string, city: string|null, address: string|null, phone: string|null, email: string|null, logo_url: string|null}, can_cancel: bool}
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;
        $invoice = $view->payment->invoice;

        return [
            'payment' => new PaymentResource($view->payment),
            'student' => [
                'id' => $invoice->studentRecord->id,
                'full_name' => $invoice->studentRecord->fullName(),
                'matricule' => $invoice->studentRecord->matricule,
            ],
            'classroom_name' => $invoice->enrollment->classroom->name(),
            'academic_year_label' => $invoice->academicYear->label,
            'remaining' => $view->remaining,
            'school' => [
                'name' => $view->school->name,
                'city' => $view->school->city,
                'address' => $view->school->address,
                'phone' => $view->school->phone,
                'email' => $view->school->email,
                'logo_url' => $view->logoUrl,
            ],
            'can_cancel' => $view->canCancel,
        ];
    }
}
