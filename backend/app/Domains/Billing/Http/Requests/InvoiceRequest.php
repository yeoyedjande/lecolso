<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Models\Invoice;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use LogicException;

/**
 * Modification d'une facture : 404 si l'élève est hors du périmètre de l'utilisateur (comme une autre école),
 * 403 s'il la voit sans pouvoir la modifier (billing.manage sur le cycle, billing.discount pour une remise).
 */
abstract class InvoiceRequest extends FormRequest
{
    protected string $ability = 'manage';

    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user instanceof User) {
            return false;
        }

        $invoice = $this->invoice();
        // Élève supprimé (suppression logique) : sa facture n'est plus accessible
        if (Student::query()->find($invoice->student_id) === null || ! $user->can('view', $invoice)) {
            throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
        }

        return $user->can($this->ability, $invoice);
    }

    public function invoice(): Invoice
    {
        $invoice = $this->route('invoice');

        return $invoice instanceof Invoice ? $invoice : throw new LogicException('Facture de la route introuvable.');
    }
}
