<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Models\Payment;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use LogicException;

/**
 * Paiement de la route : 404 si sa facture est hors du périmètre de l'utilisateur (comme une autre école), 403 s'il la
 * voit sans avoir le droit demandé ($ability sur la facture ; « view » : le reçu).
 */
abstract class PaymentRequest extends FormRequest
{
    protected string $ability = 'view';

    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user instanceof User) {
            return false;
        }

        $invoice = $this->payment()->invoice;
        if (Student::query()->find($invoice->student_id) === null || ! $user->can('view', $invoice)) {
            throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
        }

        return $user->can($this->ability, $invoice);
    }

    public function payment(): Payment
    {
        $payment = $this->route('payment');

        return $payment instanceof Payment ? $payment : throw new LogicException('Paiement de la route introuvable.');
    }
}
