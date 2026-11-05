<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Requests;

use App\Domains\Tenancy\Support\SchoolCode;
use App\Support\Phone\Phone;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateSchoolProfileRequest extends FormRequest
{
    use CurrentSchoolRequest;

    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->school()) === true;
    }

    /**
     * Champs envoyés seulement ; chaîne vide = effacer (sauf le nom, obligatoire). `code` : 2 à 5 lettres majuscules.
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'min:2', 'max:120'],
            'code' => ['sometimes', 'string', 'regex:'.SchoolCode::PATTERN],
            'city' => ['sometimes', 'nullable', 'string', 'max:80'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30', static function (string $attribute, mixed $value, Closure $fail): void {
                if (is_string($value) && trim($value) !== '' && Phone::normalize($value) === null) {
                    $fail('Saisissez un numéro de téléphone valide.');
                }
            }],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'motto' => ['sometimes', 'nullable', 'string', 'max:120'],
        ];
    }

    /**
     * @return array{name?: string, code?: string, city?: string|null, address?: string|null, phone?: string|null, email?: string|null, motto?: string|null}
     */
    public function profileAttributes(): array
    {
        $attributes = [];

        if ($this->has('name')) {
            $attributes['name'] = trim($this->string('name')->toString());
        }

        if ($this->has('code')) {
            $attributes['code'] = $this->string('code')->toString();
        }

        foreach (['city', 'address', 'email', 'motto'] as $field) {
            if ($this->exists($field)) {
                $value = trim($this->string($field)->toString());
                $attributes[$field] = $value === '' ? null : ($field === 'email' ? mb_strtolower($value) : $value);
            }
        }

        if ($this->exists('phone')) {
            $phone = trim($this->string('phone')->toString());
            $attributes['phone'] = $phone === '' ? null : Phone::normalize($phone);
        }

        return $attributes;
    }
}
