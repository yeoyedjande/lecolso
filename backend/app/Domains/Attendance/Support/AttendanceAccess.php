<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Support;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Authorization\StaffScope;
use App\Domains\Identity\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Droits sur les présences (décision du 05/11/2026) :
 * - faire l'appel ou la garderie d'une classe : le titulaire (attendance.manage) ou le personnel du cycle
 *   (attendance.manage hors rôles Parent et Enseignant : direction, secrétariat) ;
 * - voir : le titulaire, ou le personnel avec attendance.view sur le cycle ;
 * - corriger après la journée : attendance.correct sur le cycle (direction) ;
 * - décider d'une justification : le personnel avec attendance.manage sur le cycle.
 */
final readonly class AttendanceAccess
{
    public function __construct(
        private Authorizer $authorizer,
        private StaffScope $staff,
        private TenantContext $context,
    ) {}

    public function isHomeroom(User $user, Classroom $classroom): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null
            && $classroom->homeroom_teacher_id === $user->id
            && $this->authorizer->allows($user, 'attendance.manage', $schoolId, $classroom->level->cycle_id);
    }

    public function canTake(User $user, Classroom $classroom): bool
    {
        return $this->staff->allows($user, 'attendance.manage', $classroom->level->cycle_id) || $this->isHomeroom($user, $classroom);
    }

    public function canView(User $user, Classroom $classroom): bool
    {
        return $this->staff->allows($user, 'attendance.view', $classroom->level->cycle_id) || $this->isHomeroom($user, $classroom);
    }

    public function canCorrect(User $user, Classroom $classroom): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && $this->authorizer->allows($user, 'attendance.correct', $schoolId, $classroom->level->cycle_id);
    }

    public function canDecide(User $user, Classroom $classroom): bool
    {
        return $this->staff->allows($user, 'attendance.manage', $classroom->level->cycle_id);
    }

    /**
     * Classes de l'année en cours que l'utilisateur voit (personnel du cycle, ou titulaire), par niveau et section.
     *
     * @return Collection<int, Classroom>
     */
    public function classrooms(User $user): Collection
    {
        $year = AcademicYear::query()->where('is_current', true)->first();
        if ($year === null) {
            return new Collection;
        }

        $cycles = $this->staff->cycles($user, 'attendance.view');

        return Classroom::query()
            ->where('academic_year_id', $year->id)
            // Toute l'école (null) : aucune restriction ; sinon les classes dont il est titulaire et celles de ses cycles
            ->when($cycles !== null, static fn (Builder $query) => $query->where(static function (Builder $where) use ($cycles, $user): void {
                $where->where('homeroom_teacher_id', $user->id);
                if ($cycles !== null && $cycles !== []) {
                    $where->orWhereHas('level', static fn (Builder $level) => $level->whereIn('cycle_id', $cycles));
                }
            }))
            ->with(['level.cycle', 'academicYear'])
            ->get()
            ->filter(fn (Classroom $classroom): bool => $this->canView($user, $classroom))
            ->sortBy(static fn (Classroom $classroom): string => sprintf('%03d-%03d-%s', $classroom->level->cycle->position, $classroom->level->position, $classroom->section))
            ->values();
    }
}
