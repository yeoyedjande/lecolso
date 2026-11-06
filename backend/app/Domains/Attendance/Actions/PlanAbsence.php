<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Actions;

use App\Domains\Attendance\Enums\JustificationStatus;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Models\PlannedAbsence;
use App\Domains\Attendance\Support\PlannedAbsences;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\CurrentClassroom;
use App\Support\Http\BusinessConflict;
use App\Support\Time\SchoolClock;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Un parent annonce une absence de son enfant (aujourd'hui ou plus tard, 30 jours au plus, dans l'année scolaire) :
 * en attente de l'école. Les absences déjà relevées sur ces jours reçoivent aussitôt la justification.
 */
final class PlanAbsence
{
    public const int MAX_DAYS = 30;

    /**
     * @throws BusinessConflict not_enrolled, overlap
     * @throws ValidationException starts_on, ends_on
     */
    public function handle(User $author, Student $student, string $startsOn, string $endsOn, string $reason, Carbon $now): PlannedAbsence
    {
        $today = SchoolClock::date($now);
        if ($startsOn < $today) {
            throw ValidationException::withMessages(['starts_on' => 'Une absence passée se justifie depuis la liste des absences.']);
        }
        if ($endsOn < $startsOn) {
            throw ValidationException::withMessages(['ends_on' => 'La fin précède le début.']);
        }
        if (Carbon::parse($startsOn)->diffInDays(Carbon::parse($endsOn)) >= self::MAX_DAYS) {
            throw ValidationException::withMessages(['ends_on' => 'Une absence annoncée couvre '.self::MAX_DAYS.' jours au plus.']);
        }
        $classroom = CurrentClassroom::of($student->id, $today)
            ?? throw new BusinessConflict('not_enrolled', 'Cet élève n’est inscrit dans aucune classe cette année.');
        if ($endsOn > $classroom->academicYear->ends_on->toDateString()) {
            throw ValidationException::withMessages(['ends_on' => 'La fin dépasse l’année scolaire.']);
        }

        return DB::transaction(static function () use ($author, $student, $startsOn, $endsOn, $reason): PlannedAbsence {
            // Une annonce à la fois par élève : pas de chevauchement
            Student::query()->whereKey($student->id)->lockForUpdate()->first();
            $overlap = PlannedAbsence::query()->where('student_id', $student->id)
                ->where('status', '!=', JustificationStatus::Refused)
                ->whereDate('starts_on', '<=', $endsOn)
                ->whereDate('ends_on', '>=', $startsOn)
                ->exists();
            if ($overlap) {
                throw new BusinessConflict('overlap', 'Une absence est déjà annoncée sur ces jours.');
            }

            $planned = PlannedAbsence::query()->create([
                'student_id' => $student->id,
                'starts_on' => $startsOn,
                'ends_on' => $endsOn,
                'reason' => $reason,
                'status' => JustificationStatus::Pending,
                'submitted_by' => $author->id,
                'submitted_by_name' => $author->name,
            ]);
            AttendanceMark::query()->where('student_id', $student->id)
                ->whereDate('date', '>=', $startsOn)->whereDate('date', '<=', $endsOn)
                ->get()
                ->each(static fn (AttendanceMark $mark) => PlannedAbsences::justify($planned, $mark));

            return $planned;
        });
    }
}
