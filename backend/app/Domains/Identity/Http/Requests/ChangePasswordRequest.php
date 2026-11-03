<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

final class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'current_password:web'],
            'password' => ['required', 'string', 'confirmed', 'different:current_password', 'max:255', Password::min(8)],
        ];
    }

    public function newPassword(): string
    {
        return $this->string('password')->toString();
    }
}
