<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Requests;

use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/** Garderie d'un jour (`date`, aujourd'hui par défaut) : qui voit au moins une classe. */
final class DaycareBoardRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && app(AttendanceAccess::class)->classrooms($user)->isNotEmpty();
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['date' => ['nullable', 'date_format:Y-m-d']];
    }
}
