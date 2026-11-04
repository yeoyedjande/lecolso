<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Requests;

use App\Domains\Identity\Models\SchoolRole;
use Illuminate\Foundation\Http\FormRequest;

final class ViewSchoolRolesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', SchoolRole::class) === true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }
}
