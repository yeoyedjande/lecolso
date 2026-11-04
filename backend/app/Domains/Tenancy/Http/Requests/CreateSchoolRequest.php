<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Requests;

use App\Domains\Tenancy\Data\NewSchool;
use App\Domains\Tenancy\Enums\SchoolType;
use App\Support\Phone\Phone;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class CreateSchoolRequest extends FormRequest
{
    /** Sous-domaines réservés à la plateforme. */
    public const array RESERVED_SLUGS = ['app', 'api', 'www', 'admin', 'staging', 'plateforme', 'mail', 'static'];

    public function authorize(): bool
    {
        // Route protégée par EnsureSuperAdmin (404 pour les autres)
        return true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        /** @var list<string> $catalog */
        $catalog = array_keys(config()->array('cycles'));

        return [
            'name' => ['required', 'string', 'min:3', 'max:120'],
            // Sous-domaine <slug>.<domaine> : minuscules, chiffres et tirets
            'slug' => ['required', 'string', 'min:3', 'max:50', 'regex:/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/', Rule::notIn(self::RESERVED_SLUGS)],
            'city' => ['nullable', 'string', 'max:80'],
            'type' => ['sometimes', Rule::enum(SchoolType::class)],
            'cycles' => ['required', 'array', 'min:1'],
            'cycles.*' => ['required', 'string', 'distinct', Rule::in($catalog)],
            'director' => ['required', 'array'],
            'director.name' => ['required', 'string', 'min:3', 'max:120'],
            'director.phone' => ['required', 'string', 'max:30', static function (string $attribute, mixed $value, Closure $fail): void {
                if (! is_string($value) || Phone::normalize($value) === null) {
                    $fail('Saisissez un numéro de téléphone valide.');
                }
            }],
            'director.email' => ['nullable', 'email', 'max:255'],
        ];
    }

    public function toData(): NewSchool
    {
        /** @var list<string> $cycles */
        $cycles = array_values($this->array('cycles'));
        $email = $this->string('director.email')->trim()->toString();

        return new NewSchool(
            name: $this->string('name')->trim()->toString(),
            slug: $this->string('slug')->toString(),
            city: $this->filled('city') ? $this->string('city')->trim()->toString() : null,
            type: $this->enum('type', SchoolType::class) ?? SchoolType::PreschoolPrimary,
            cycles: $cycles,
            directorName: $this->string('director.name')->trim()->toString(),
            directorPhone: Phone::normalize($this->string('director.phone')->toString()) ?? '',
            directorEmail: $email === '' ? null : $email,
        );
    }
}
