<?php

declare(strict_types=1);

namespace App\Domains\Family\Support;

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;

/**
 * Enfants de l'espace parent : élèves dont un tuteur a le téléphone du compte, pour un compte qui a le rôle Parent dans
 * l'école courante. Un membre du personnel qui est aussi parent ne voit ici que ses propres enfants, jamais toute l'école.
 */
final readonly class GuardianChildren
{
    public function __construct(
        private Authorizer $authorizer,
        private TenantContext $context,
    ) {}

    /**
     * @return Builder<Student>
     */
    public function query(User $user): Builder
    {
        $schoolId = $this->context->schoolId();
        $isGuardian = $schoolId !== null && $this->authorizer->assignments($user, $schoolId)
            ->contains(static fn (RoleAssignment $assignment): bool => $assignment->role === Role::Guardian->value);
        if (! $isGuardian) {
            return Student::query()->whereRaw('false');
        }

        return Student::query()
            ->whereHas('guardianLinks.guardian', static fn (Builder $guardian) => $guardian->where('phone', $user->phone))
            ->orderBy('first_name');
    }

    /** Inscription à montrer : celle de l'année en cours (la plus récente), sinon la dernière. */
    public static function enrollment(Student $student): ?Enrollment
    {
        return Enrollment::query()
            ->where('student_id', $student->id)
            ->with(['classroom.level.cycle', 'academicYear'])
            ->join('academic_years', 'academic_years.id', '=', 'enrollments.academic_year_id')
            ->orderByDesc('academic_years.is_current')
            ->orderByDesc('enrollments.enrolled_on')
            ->select('enrollments.*')
            ->first();
    }
}
