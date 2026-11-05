<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;
use LogicException;

final class UploadSchoolLogoRequest extends FormRequest
{
    use CurrentSchoolRequest;

    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->school()) === true;
    }

    /**
     * `logo` : image JPEG, PNG ou WebP, 2 Mo au plus, au moins 64 × 64 px (multipart/form-data).
     *
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'logo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:min_width=64,min_height=64,max_width=8000,max_height=8000'],
        ];
    }

    public function logo(): UploadedFile
    {
        $file = $this->file('logo');

        return $file instanceof UploadedFile ? $file : throw new LogicException('Fichier logo manquant après validation.');
    }
}
