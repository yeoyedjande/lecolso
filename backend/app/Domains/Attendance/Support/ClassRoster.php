<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Support;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Élèves d'une classe à une date : inscrits à cette date (inscription commencée, pas encore partis), dossiers non
 * supprimés, par nom puis prénom.
 */
final class ClassRoster
{
    /**
     * @return Collection<int, Student>
     */
    public static function on(Classroom $classroom, string $date): Collection
    {
        return Student::query()
            ->whereHas('enrollments', static fn (Builder $enrollment) => self::enrolledOn($enrollment, $classroom->id, $date))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();
    }

    /**
     * @param  Builder<Enrollment>  $enrollment
     * @return Builder<Enrollment>
     */
    public static function enrolledOn(Builder $enrollment, string $classroomId, string $date): Builder
    {
        return $enrollment->where('classroom_id', $classroomId)
            ->where('enrolled_on', '<=', $date)
            ->where(static fn (Builder $q) => $q->where('status', EnrollmentStatus::Active)->orWhere('left_on', '>', $date));
    }
}
