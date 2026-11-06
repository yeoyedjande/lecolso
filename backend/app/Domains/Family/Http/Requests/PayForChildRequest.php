<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Requests;

use App\Domains\Billing\Enums\PaymentMethod;
use App\Support\Phone\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Payer par Mobile Money : `amount` (FCFA, entier, au plus le reste dû), `method` (orange_money, mtn_momo,
 * moov_money, wave), `phone` (numéro Mobile Money, normalisé en E.164). Enfant d'un autre parent : 404.
 */
final class PayForChildRequest extends FormRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'integer', 'min:100', 'max:100000000'],
            'method' => ['required', Rule::in([PaymentMethod::OrangeMoney->value, PaymentMethod::MtnMomo->value, PaymentMethod::MoovMoney->value, PaymentMethod::Wave->value])],
            'phone' => ['required', 'string', 'max:30'],
        ];
    }

    /**
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->filled('phone') && Phone::normalize($this->string('phone')->toString()) === null) {
                    $validator->errors()->add('phone', 'Numéro Mobile Money invalide.');
                }
            },
        ];
    }

    public function paymentMethod(): PaymentMethod
    {
        return PaymentMethod::from($this->string('method')->toString());
    }

    public function phone(): string
    {
        return Phone::normalize($this->string('phone')->toString()) ?? '';
    }
}
