<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Requests;

/** Appel d'une classe pour un jour (qui voit la classe). */
final class ShowRollCallRequest extends ClassroomAttendanceRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }
}
