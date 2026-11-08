<?php

declare(strict_types=1);

namespace App\Domains\Academic\Actions;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Academic\Policies\ClassroomPolicy;
use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Tenancy\Models\School;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Classes d'une année (l'année en cours par défaut), par niveau puis section ; un utilisateur limité à des cycles
 * ne voit que les classes de ses cycles.
 */
final readonly class ListClassrooms
{
    public function __construct(private Authorizer $authorizer) {}

    /**
     * @return Collection<int, Classroom>
     */
    public function handle(User $user, School $school, ?string $academicYearId): Collection
    {
        $yearId = $academicYearId ?? AcademicYear::query()->where('is_current', true)->value('id');

        if (! is_string($yearId)) {
            return new Collection;
        }

        $scope = self::scope($this->authorizer->permissionsFor($user, $school));

        return Classroom::query()
            ->with(['level.cycle', 'homeroomTeacher'])
            ->withCount(['enrollments as enrolled_count' => static fn (Builder $enrollment) => $enrollment
                ->where('status', EnrollmentStatus::Active)
                ->whereHas('student')])
            ->where('academic_year_id', $yearId)
            ->when($scope !== null, static fn (Builder $query) => $query->whereHas(
                'level',
                static fn (Builder $level) => $level->whereIn('cycle_id', $scope ?? []),
            ))
            ->get()
            ->sortBy([
                static fn (Classroom $a, Classroom $b): int => [$a->level->cycle->position, $a->level->position] <=> [$b->level->cycle->position, $b->level->position],
                static fn (Classroom $a, Classroom $b): int => strcmp($a->section, $b->section),
            ])
            ->values();
    }

    /**
     * Union des périmètres des permissions qui donnent la liste : null si l'une couvre toute l'école.
     *
     * @param  array<string, list<string>|null>  $permissions
     * @return list<string>|null
     */
    private static function scope(array $permissions): ?array
    {
        $cycles = [];

        foreach (ClassroomPolicy::VIEW_PERMISSIONS as $permission) {
            if (! array_key_exists($permission, $permissions)) {
                continue;
            }

            if ($permissions[$permission] === null) {
                return null;
            }

            $cycles = [...$cycles, ...$permissions[$permission]];
        }

        return array_values(array_unique($cycles));
    }
}
