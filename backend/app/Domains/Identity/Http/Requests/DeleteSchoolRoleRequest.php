<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Requests;

use App\Domains\Identity\Models\SchoolRole;
use Illuminate\Foundation\Http\FormRequest;

final class DeleteSchoolRoleRequest extends FormRequest
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
        return [];
    }
}
