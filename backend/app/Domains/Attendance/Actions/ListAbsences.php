<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Enums\JustificationStatus;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Identity\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Absences et retards d'un jour (ou justifications en attente, tous jours), dans les classes que l'utilisateur voit.
 */
final readonly class ListAbsences
{
    public function __construct(private AttendanceAccess $access) {}

    /**
     * @return Collection<int, AttendanceMark>
     */
    public function handle(User $user, ?string $date, bool $pendingOnly): Collection
    {
        $classrooms = $this->access->classrooms($user)->keyBy('id');
        if ($classrooms->isEmpty()) {
            return new Collection;
        }

        return AttendanceMark::query()
            ->whereHas('student')
            ->whereHas('rollCall', static fn (Builder $call) => $call->whereIn('classroom_id', $classrooms->keys()))
            ->when($date !== null, static fn (Builder $q) => $q->whereDate('date', (string) $date))
            ->when($pendingOnly, static fn (Builder $q) => $q->whereHas('justification', static fn (Builder $j) => $j->where('status', JustificationStatus::Pending)))
            ->with(['student', 'justification', 'rollCall'])
            ->orderByDesc('date')
            ->get()
            ->each(static function (AttendanceMark $mark) use ($classrooms): void {
                $classroom = $classrooms->get($mark->rollCall->classroom_id);
                if ($classroom instanceof Classroom) {
                    $mark->rollCall->setRelation('classroom', $classroom);
                }
            })
            ->sortBy(static fn (AttendanceMark $mark): string => $mark->date->toDateString().$mark->rollCall->classroom->name().$mark->student->last_name)
            ->values();
    }
}
