<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Authorization\StaffScope;
use App\Domains\Identity\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Droits sur les notes et compétences (décision du 06/11/2026) :
 * - saisir (évaluations, notes, compétences) : le titulaire (grades.manage) ou le personnel du cycle avec
 *   grades.manage (direction) ;
 * - voir : le titulaire, ou le personnel avec grades.view sur le cycle ;
 * - régler périodes, matières, coefficients et référentiel : school.settings.manage sur le cycle ;
 * - valider ou déverrouiller les bulletins, observation et mention : personnel avec grades.validate sur le cycle.
 */
final readonly class GradingAccess
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
            && $this->authorizer->allows($user, 'grades.manage', $schoolId, $classroom->level->cycle_id);
    }

    public function canManage(User $user, Classroom $classroom): bool
    {
        return $this->staff->allows($user, 'grades.manage', $classroom->level->cycle_id) || $this->isHomeroom($user, $classroom);
    }

    public function canView(User $user, Classroom $classroom): bool
    {
        return $this->staff->allows($user, 'grades.view', $classroom->level->cycle_id) || $this->isHomeroom($user, $classroom);
    }

    public function canValidate(User $user, Classroom $classroom): bool
    {
        return $this->staff->allows($user, 'grades.validate', $classroom->level->cycle_id);
    }

    public function canConfigure(User $user, string $cycleId): bool
    {
        return $this->staff->allows($user, 'school.settings.manage', $cycleId);
    }

    public function canViewSettings(User $user, string $cycleId): bool
    {
        return $this->staff->allows($user, 'school.settings.view', $cycleId) || $this->canConfigure($user, $cycleId);
    }

    /**
     * Classes de l'année en cours que l'utilisateur voit (personnel du cycle, ou titulaire), par cycle, niveau et section.
     *
     * @return Collection<int, Classroom>
     */
    public function classrooms(User $user): Collection
    {
        $year = AcademicYear::query()->where('is_current', true)->first();
        if ($year === null) {
            return new Collection;
        }

        $cycles = $this->staff->cycles($user, 'grades.view');

        return Classroom::query()
            ->where('academic_year_id', $year->id)
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
