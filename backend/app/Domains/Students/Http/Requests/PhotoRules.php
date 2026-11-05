<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use Illuminate\Http\UploadedFile;
use LogicException;

/** Photo envoyée (multipart/form-data, champ `photo`) : JPEG, PNG ou WebP, 5 Mo au plus, au moins 64 × 64 px. */
trait PhotoRules
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'photo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:min_width=64,min_height=64,max_width=8000,max_height=8000'],
        ];
    }

    public function photo(): UploadedFile
    {
        $file = $this->file('photo');

        return $file instanceof UploadedFile ? $file : throw new LogicException('Photo manquante après validation.');
    }
}
