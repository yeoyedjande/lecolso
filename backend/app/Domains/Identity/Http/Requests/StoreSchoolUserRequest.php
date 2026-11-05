<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Requests;

use App\Domains\Identity\Data\NewSchoolUser;
use App\Domains\Identity\Models\User;
use App\Support\Phone\Phone;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

final class StoreSchoolUserRequest extends FormRequest
{
    /** users.manage, et le droit d'attribuer chacun des rôles demandés (cycle, hiérarchie, pas d'élévation). */
    public function authorize(): bool
    {
        $actor = $this->user();

        if (! $actor instanceof User || ! $actor->can('create', User::class)) {
            return false;
        }

        foreach ($this->roleInputs() as $role) {
            if (! $actor->can('grantRole', [User::class, null, $role['role'], $role['cycle_id']])) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'phone' => ['required', 'string', 'max:30', static function (string $attribute, mixed $value, Closure $fail): void {
                if (! is_string($value) || Phone::normalize($value) === null) {
                    $fail('Saisissez un numéro de téléphone valide.');
                }
            }],
            'email' => ['nullable', 'email', 'max:255'],
            'roles' => ['required', 'array', 'min:1', 'max:10'],
            'roles.*.role' => ['required', 'string', 'max:64'],
            'roles.*.cycle_id' => ['nullable', 'uuid'],
        ];
    }

    public function newUser(): NewSchoolUser
    {
        $email = trim($this->string('email')->toString());

        return new NewSchoolUser(
            name: trim($this->string('name')->toString()),
            phone: Phone::normalize($this->string('phone')->toString()) ?? '',
            email: $email === '' ? null : mb_strtolower($email),
            roles: $this->roleInputs(),
        );
    }

    /**
     * Rôles demandés, lus sans faire confiance à leur forme (la validation suit l'autorisation).
     *
     * @return list<array{role: string, cycle_id: string|null}>
     */
    private function roleInputs(): array
    {
        $roles = [];

        foreach ($this->array('roles') as $role) {
            if (is_array($role) && is_string($role['role'] ?? null)) {
                $cycle = $role['cycle_id'] ?? null;
                $roles[] = ['role' => $role['role'], 'cycle_id' => is_string($cycle) && $cycle !== '' ? $cycle : null];
            }
        }

        return $roles;
    }
}
