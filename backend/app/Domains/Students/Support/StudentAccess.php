<?php

declare(strict_types=1);

namespace App\Domains\Students\Support;

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Authorization\RoleCatalog;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use Illuminate\Database\Eloquent\Builder;

/**
 * Élèves qu'un utilisateur peut voir pour une permission (students.view, students.medical.view), selon le rôle
 * de chaque affectation qui la donne (règle du cahier des charges, config/permissions.php) :
 * - enseignant : élèves inscrits (inscription active) dans une classe de l'année en cours dont il est titulaire ;
 * - parent : élèves dont il est tuteur, rapprochés par le téléphone de son compte ;
 * - tout autre rôle (système ou personnalisé) : toute l'école, ou les élèves inscrits (une année quelconque)
 *   dans une classe de son cycle.
 */
final readonly class StudentAccess
{
    public function __construct(
        private Authorizer $authorizer,
        private RoleCatalog $catalog,
    ) {}

    /**
     * Restreint une requête sur les élèves à ceux que l'utilisateur peut voir (aucun sans affectation qui donne la permission).
     *
     * @param  Builder<Student>  $query
     * @return Builder<Student>
     */
    public function constrain(Builder $query, User $user, School|string $school, string $permission = 'students.view'): Builder
    {
        $grants = $this->grants($user, $school, $permission);

        if ($grants === []) {
            return $query->whereRaw('false');
        }

        foreach ($grants as $grant) {
            if ($grant->role !== Role::Teacher->value && $grant->role !== Role::Guardian->value && $grant->cycle_id === null) {
                return $query;
            }
        }

        return $query->where(static function (Builder $where) use ($grants, $user): void {
            foreach ($grants as $grant) {
                $cycleId = $grant->cycle_id;

                match ($grant->role) {
                    Role::Teacher->value => $where->orWhereHas('enrollments', static fn (Builder $enrollment) => $enrollment
                        ->where('status', EnrollmentStatus::Active)
                        ->whereHas('classroom', static fn (Builder $classroom) => $classroom
                            ->where('homeroom_teacher_id', $user->id)
                            ->whereHas('academicYear', static fn (Builder $year) => $year->where('is_current', true))
                            ->when($cycleId !== null, static fn (Builder $scoped) => $scoped->whereHas(
                                'level',
                                static fn (Builder $level) => $level->where('cycle_id', $cycleId),
                            )))),
                    Role::Guardian->value => $where->orWhereHas('guardianLinks.guardian', static fn (Builder $guardian) => $guardian
                        ->where('phone', $user->phone)),
                    default => $where->orWhereHas('enrollments.classroom.level', static fn (Builder $level) => $level
                        ->where('cycle_id', $cycleId)),
                };
            }
        });
    }

    public function allows(User $user, Student $student, School|string $school, string $permission = 'students.view'): bool
    {
        return $this->constrain(Student::query()->whereKey($student->id), $user, $school, $permission)->exists();
    }

    /**
     * Cycle de l'élève : celui de sa classe la plus récente (inscription de l'année la plus récente), null sans inscription.
     */
    public function cycleOf(Student $student): ?string
    {
        $enrollment = Enrollment::query()
            ->where('enrollments.student_id', $student->id)
            ->join('academic_years', 'academic_years.id', '=', 'enrollments.academic_year_id')
            ->orderByDesc('academic_years.starts_on')
            ->select('enrollments.*')
            ->with('classroom.level')
            ->first();

        return $enrollment?->classroom->level->cycle_id;
    }

    /** Gérer le dossier de l'élève : students.manage sur son cycle (ou sur toute l'école). */
    public function manages(User $user, Student $student, School|string $school): bool
    {
        return $this->authorizer->allows($user, 'students.manage', $school, $this->cycleOf($student));
    }

    /**
     * Affectations de l'utilisateur dont le rôle donne la permission.
     *
     * @return list<RoleAssignment>
     */
    private function grants(User $user, School|string $school, string $permission): array
    {
        $roles = $this->catalog->rolesOf($school);

        return array_values($this->authorizer->assignments($user, $school)
            ->filter(static fn (RoleAssignment $assignment): bool => ($roles[$assignment->role] ?? null)?->grants($permission) === true)
            ->all());
    }
}
