<?php

declare(strict_types=1);

namespace App\Domains\Family\Actions;

use App\Domains\Attendance\Enums\AttendanceStatus;
use App\Domains\Attendance\Enums\JustificationStatus;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Models\RollCall;
use App\Domains\Attendance\Support\ClassRoster;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Support\InvoiceBalance;
use App\Domains\Family\Data\ChildSummary;
use App\Domains\Family\Support\GuardianChildren;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Enrollment;
use App\Support\Time\SchoolClock;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Accueil de l'espace parent : pour chaque enfant, sa classe, sa présence du jour (appel fait), le reste à payer et le
 * retard de sa facture de l'année, et le nombre d'absences à justifier.
 */
final readonly class ListGuardianChildren
{
    public function __construct(private GuardianChildren $children) {}

    /**
     * @return list<ChildSummary>
     */
    public function handle(User $user, Carbon $now): array
    {
        $today = SchoolClock::date($now);
        $summaries = [];
        foreach ($this->children->query($user)->get() as $student) {
            $enrollment = GuardianChildren::enrollment($student);
            $presence = null;
            // Présence déduite de l'appel seulement si l'enfant était inscrit dans la classe ce jour-là (pas parti, déjà arrivé)
            if ($enrollment !== null && ClassRoster::enrolledOn(Enrollment::query()->whereKey($enrollment->id), $enrollment->classroom_id, $today)->exists()) {
                $call = RollCall::query()->where('classroom_id', $enrollment->classroom_id)->whereDate('date', $today)->first();
                if ($call !== null) {
                    $mark = AttendanceMark::query()->where('roll_call_id', $call->id)->where('student_id', $student->id)->first();
                    $presence = $mark === null ? AttendanceStatus::Present->value : $mark->status->value;
                }
            }
            $invoice = $enrollment === null ? null : Invoice::query()->where('enrollment_id', $enrollment->id)->first();
            $toJustify = AttendanceMark::query()
                ->where('student_id', $student->id)
                ->where('status', AttendanceStatus::Absent)
                ->where(static fn (Builder $where) => $where->whereDoesntHave('justification')
                    ->orWhereHas('justification', static fn (Builder $justification) => $justification->where('status', JustificationStatus::Refused)))
                ->when($enrollment !== null, static fn (Builder $query) => $query->whereDate('date', '>=', $enrollment?->academicYear->starts_on->toDateString()))
                ->count();

            $summaries[] = new ChildSummary(
                $student,
                $enrollment,
                $presence,
                $invoice === null ? null : InvoiceBalance::of($invoice, $now),
                $toJustify,
            );
        }

        return $summaries;
    }
}
