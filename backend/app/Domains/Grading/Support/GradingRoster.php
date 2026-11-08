<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Models\Term;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Models\Student;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Élèves d'une classe pendant une période : inscrits avant la fin de la période et pas partis avant son début (un
 * élève parti en cours de période garde ses notes), dossiers non supprimés, par nom puis prénom.
 */
final class GradingRoster
{
    /**
     * @return Collection<int, Student>
     */
    public static function of(Classroom $classroom, Term $term): Collection
    {
        $start = $term->starts_on->toDateString();
        $end = $term->ends_on->toDateString();

        return Student::query()
            ->whereHas('enrollments', static fn (Builder $enrollment) => $enrollment->where('classroom_id', $classroom->id)
                ->where('enrolled_on', '<=', $end)
                ->where(static fn (Builder $q) => $q->where('status', EnrollmentStatus::Active)->orWhere('left_on', '>', $start)))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();
    }
}
