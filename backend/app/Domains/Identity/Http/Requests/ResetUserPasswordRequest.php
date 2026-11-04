<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Requests;

use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;

final class ResetUserPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        $target = $this->route('user');

        return $target instanceof User && $this->user()?->can('resetPassword', $target) === true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }

    public function target(): User
    {
        $target = $this->route('user');

        if (! $target instanceof User) {
            throw new \LogicException('Paramètre de route {user} manquant.');
        }

        return $target;
    }
}
