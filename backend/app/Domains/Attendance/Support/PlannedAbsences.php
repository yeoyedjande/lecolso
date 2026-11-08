<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Support;

use App\Domains\Attendance\Enums\AttendanceStatus;
use App\Domains\Attendance\Enums\JustificationSource;
use App\Domains\Attendance\Enums\JustificationStatus;
use App\Domains\Attendance\Models\AbsenceJustification;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Models\PlannedAbsence;
use Illuminate\Support\Collection;

/**
 * Absences annoncées par les parents et l'appel : un jour couvert par une absence annoncée (non refusée), l'enfant est
 * proposé absent et son absence reçoit la justification du parent, avec le statut de l'absence annoncée.
 */
final class PlannedAbsences
{
    /**
     * Absences annoncées, non refusées, qui couvrent ce jour, par élève.
     *
     * @param  list<string>  $studentIds
     * @return Collection<string, PlannedAbsence>
     */
    public static function covering(array $studentIds, string $date): Collection
    {
        if ($studentIds === []) {
            return new Collection;
        }

        return PlannedAbsence::query()
            ->whereIn('student_id', $studentIds)
            ->where('status', '!=', JustificationStatus::Refused)
            ->whereDate('starts_on', '<=', $date)
            ->whereDate('ends_on', '>=', $date)
            ->orderBy('created_at')
            ->get()
            ->keyBy('student_id');
    }

    /** Rattache l'absence annoncée à une absence relevée qui n'a pas encore de justification. */
    public static function justify(PlannedAbsence $planned, AttendanceMark $mark): void
    {
        if ($mark->status !== AttendanceStatus::Absent || AbsenceJustification::query()->where('attendance_mark_id', $mark->id)->exists()) {
            return;
        }
        AbsenceJustification::query()->create([
            'attendance_mark_id' => $mark->id,
            'reason' => $planned->reason,
            'source' => JustificationSource::Guardian,
            'status' => $planned->status,
            'submitted_by' => $planned->submitted_by,
            'submitted_by_name' => $planned->submitted_by_name,
            'decided_by' => $planned->decided_by,
            'decided_by_name' => $planned->decided_by_name,
            'decided_at' => $planned->decided_at,
            'decision_note' => $planned->decision_note,
            'planned_absence_id' => $planned->id,
        ]);
    }
}
