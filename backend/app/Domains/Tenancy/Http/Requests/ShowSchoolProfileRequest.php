<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ShowSchoolProfileRequest extends FormRequest
{
    use CurrentSchoolRequest;

    public function authorize(): bool
    {
        return $this->user()?->can('view', $this->school()) === true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }
}
