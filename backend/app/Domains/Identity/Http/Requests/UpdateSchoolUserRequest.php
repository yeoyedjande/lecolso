<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Requests;

use App\Domains\Identity\Models\User;
use App\Support\Phone\Phone;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateSchoolUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage', $this->target()) === true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'min:2', 'max:100'],
            'phone' => ['sometimes', 'string', 'max:30', static function (string $attribute, mixed $value, Closure $fail): void {
                if (! is_string($value) || Phone::normalize($value) === null) {
                    $fail('Saisissez un numéro de téléphone valide.');
                }
            }],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
        ];
    }

    public function target(): User
    {
        $target = $this->route('user');

        return $target instanceof User ? $target : throw new \LogicException('Paramètre de route {user} manquant.');
    }

    public function name(): ?string
    {
        return $this->has('name') ? trim($this->string('name')->toString()) : null;
    }

    public function phone(): ?string
    {
        return $this->has('phone') ? Phone::normalize($this->string('phone')->toString()) : null;
    }

    public function hasEmail(): bool
    {
        return $this->exists('email');
    }

    public function email(): ?string
    {
        $email = trim($this->string('email')->toString());

        return $email === '' ? null : mb_strtolower($email);
    }
}
