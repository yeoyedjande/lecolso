<?php

declare(strict_types=1);

namespace App\Domains\Students\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Students\Data\StudentFile;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\StudentAccess;
use App\Domains\Tenancy\Models\School;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Dossier complet : tuteurs, inscriptions (la plus récente d'abord), fratrie (élèves qui partagent un tuteur,
 * parmi ceux que l'utilisateur peut voir), droits de l'utilisateur (gestion, données médicales).
 */
final readonly class PresentStudent
{
    public function __construct(private StudentAccess $access) {}

    public function handle(User $user, School $school, Student $student): StudentFile
    {
        $student->load([
            'guardianLinks.guardian',
            'enrollments' => static fn (HasMany $enrollment) => $enrollment
                ->join('academic_years', 'academic_years.id', '=', 'enrollments.academic_year_id')
                ->orderByDesc('academic_years.starts_on')
                ->select('enrollments.*')
                ->with(['academicYear', 'classroom.level.cycle', 'classroom.homeroomTeacher']),
        ]);

        $guardianIds = $student->guardianLinks->pluck('guardian_id')->all();
        $siblings = $this->access->constrain(Student::query(), $user, $school)
            ->whereKeyNot($student->id)
            ->whereHas('guardianLinks', static fn (Builder $link) => $link->whereIn('guardian_id', $guardianIds))
            ->with(['enrollments' => static fn (HasMany $enrollment) => $enrollment
                ->whereHas('academicYear', static fn (Builder $year) => $year->where('is_current', true))
                ->with('classroom.level')])
            ->orderBy('birth_date')
            ->get();

        return new StudentFile(
            $student,
            $this->access->manages($user, $student, $school),
            $this->access->allows($user, $student, $school, 'students.medical.view'),
            $siblings,
        );
    }
}
