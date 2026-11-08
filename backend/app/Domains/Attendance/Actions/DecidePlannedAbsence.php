<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Actions;

use App\Domains\Attendance\Enums\JustificationStatus;
use App\Domains\Attendance\Models\AbsenceJustification;
use App\Domains\Attendance\Models\PlannedAbsence;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Décision de l'école sur une absence annoncée : la même décision s'applique aux justifications qu'elle a déjà données
 * aux absences relevées (encore en attente) et à celles des appels à venir.
 */
final class DecidePlannedAbsence
{
    /**
     * @throws BusinessConflict already_decided
     */
    public function handle(User $author, PlannedAbsence $planned, bool $accepted, ?string $note, Carbon $now): PlannedAbsence
    {
        return DB::transaction(static function () use ($author, $planned, $accepted, $note, $now): PlannedAbsence {
            $locked = PlannedAbsence::query()->whereKey($planned->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== JustificationStatus::Pending) {
                throw new BusinessConflict('already_decided', 'Cette absence annoncée a déjà été traitée.');
            }
            $decision = [
                'status' => $accepted ? JustificationStatus::Accepted : JustificationStatus::Refused,
                'decided_by' => $author->id,
                'decided_by_name' => $author->name,
                'decided_at' => $now,
                'decision_note' => $note,
            ];
            $locked->fill($decision)->save();
            AbsenceJustification::query()->where('planned_absence_id', $locked->id)->where('status', JustificationStatus::Pending)
                ->get()
                ->each(static fn (AbsenceJustification $justification): bool => $justification->fill($decision)->save());

            return $locked;
        });
    }
}
