<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Requests;

use App\Domains\Attendance\Actions\ApplySyncOperations;
use App\Domains\Attendance\Enums\AttendanceStatus;
use Illuminate\Support\Carbon;

/**
 * Appel d'une classe : `marks` (élève, statut present/absent/late, minutes de retard), `reason` (obligatoire pour
 * corriger une journée passée), `roll_call_id` et `recorded_at` (saisie hors connexion). Droits contrôlés par l'Action.
 */
final class SaveRollCallRequest extends ClassroomAttendanceRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'marks' => ['present', 'array', 'max:200'],
            'marks.*.student_id' => ['required', 'uuid', 'distinct'],
            'marks.*.status' => ['required', 'in:present,absent,late'],
            'marks.*.late_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
            'reason' => ['nullable', 'string', 'max:200'],
            'roll_call_id' => ['nullable', 'uuid'],
            'recorded_at' => ['nullable', 'date'],
        ];
    }

    /**
     * @return list<array{student_id: string, status: AttendanceStatus, late_minutes: int|null}>
     */
    public function marks(): array
    {
        return ApplySyncOperations::marks($this->validated());
    }

    public function reason(): ?string
    {
        $reason = trim($this->string('reason')->toString());

        return $reason === '' ? null : $reason;
    }

    public function recordedAt(): ?Carbon
    {
        return $this->filled('recorded_at') ? Carbon::parse($this->string('recorded_at')->toString()) : null;
    }

    public function rollCallId(): ?string
    {
        return $this->filled('roll_call_id') ? $this->string('roll_call_id')->toString() : null;
    }
}
