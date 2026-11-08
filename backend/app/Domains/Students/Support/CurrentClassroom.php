<?php

declare(strict_types=1);

namespace App\Domains\Students\Support;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Models\Enrollment;
use Illuminate\Database\Eloquent\Builder;

/** Classe d'un élève un jour donné : son inscription de l'année en cours, commencée et pas encore terminée. */
final class CurrentClassroom
{
    public static function of(string $studentId, string $date): ?Classroom
    {
        return Enrollment::query()
            ->where('student_id', $studentId)
            ->whereHas('academicYear', static fn (Builder $year) => $year->where('is_current', true))
            ->where('enrolled_on', '<=', $date)
            ->where(static fn (Builder $q) => $q->where('status', EnrollmentStatus::Active)->orWhere('left_on', '>', $date))
            ->with(['classroom.level.cycle', 'classroom.academicYear'])
            ->first()
            ?->classroom;
    }
}
