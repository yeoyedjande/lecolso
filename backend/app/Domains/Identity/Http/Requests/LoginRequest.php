<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            // Téléphone (« 07 00 00 00 00 », « +225… ») ou adresse e-mail
            'login' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
            // « Se souvenir de moi » (30 jours) : ignoré pour les comptes du personnel
            'remember' => ['sometimes', 'boolean'],
        ];
    }

    public function login(): string
    {
        return $this->string('login')->toString();
    }

    public function password(): string
    {
        return $this->string('password')->toString();
    }
}
