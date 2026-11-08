<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Requests;

use App\Domains\Identity\Models\SchoolRole;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateSchoolRoleRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'min:2', 'max:60'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'permissions' => ['sometimes', 'array', 'max:100'],
            'permissions.*' => ['string', 'distinct'],
        ];
    }

    public function roleKey(): string
    {
        $key = $this->route('role');

        return is_string($key) ? $key : '';
    }

    public function name(): ?string
    {
        return $this->has('name') ? trim($this->string('name')->toString()) : null;
    }

    public function hasDescription(): bool
    {
        return $this->exists('description');
    }

    public function description(): ?string
    {
        $description = trim($this->string('description')->toString());

        return $description === '' ? null : $description;
    }

    /**
     * @return list<string>|null
     */
    public function permissions(): ?array
    {
        if (! $this->has('permissions')) {
            return null;
        }

        /** @var list<string> $permissions */
        $permissions = array_values($this->array('permissions'));

        return $permissions;
    }
}
