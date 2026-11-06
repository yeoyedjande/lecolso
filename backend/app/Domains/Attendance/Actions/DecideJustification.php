<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Actions;

use App\Domains\Attendance\Enums\JustificationStatus;
use App\Domains\Attendance\Models\AbsenceJustification;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Décision de l'école sur une justification envoyée par un parent : acceptée (absence excusée) ou refusée. */
final class DecideJustification
{
    /**
     * @throws BusinessConflict already_decided
     */
    public function handle(User $author, AbsenceJustification $justification, bool $accepted, ?string $note, Carbon $now): AbsenceJustification
    {
        return DB::transaction(static function () use ($author, $justification, $accepted, $note, $now): AbsenceJustification {
            $locked = AbsenceJustification::query()->whereKey($justification->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== JustificationStatus::Pending) {
                throw new BusinessConflict('already_decided', 'Cette justification a déjà été traitée.');
            }
            $locked->fill([
                'status' => $accepted ? JustificationStatus::Accepted : JustificationStatus::Refused,
                'decided_by' => $author->id,
                'decided_by_name' => $author->name,
                'decided_at' => $now,
                'decision_note' => $note,
            ])->save();

            return $locked;
        });
    }
}
