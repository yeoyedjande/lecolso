<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Requests;

use App\Domains\Academic\Models\Classroom;
use Illuminate\Foundation\Http\FormRequest;

final class DeleteClassroomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->classroom()) === true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }

    public function classroom(): Classroom
    {
        $classroom = $this->route('classroom');

        return $classroom instanceof Classroom ? $classroom : throw new \LogicException('Paramètre de route {classroom} manquant.');
    }
}
