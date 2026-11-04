<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Requests;

use App\Domains\Identity\Models\SchoolRole;
use Illuminate\Foundation\Http\FormRequest;

final class StoreSchoolRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage', SchoolRole::class) === true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:60'],
            'description' => ['nullable', 'string', 'max:255'],
            // Clés de GET /permissions ; validées par ValidateRolePermissions (catalogue, parents, élévation)
            'permissions' => ['present', 'array', 'max:100'],
            'permissions.*' => ['string', 'distinct'],
        ];
    }

    public function name(): string
    {
        return trim($this->string('name')->toString());
    }

    public function description(): ?string
    {
        $description = trim($this->string('description')->toString());

        return $description === '' ? null : $description;
    }

    /**
     * @return list<string>
     */
    public function permissions(): array
    {
        /** @var list<string> $permissions */
        $permissions = array_values($this->array('permissions'));

        return $permissions;
    }
}
