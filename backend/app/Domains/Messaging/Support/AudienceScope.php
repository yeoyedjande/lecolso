<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Support;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\CurrentClassroom;
use App\Support\Tenancy\TenantContext;
use App\Support\Time\SchoolClock;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Ce que l'utilisateur voit des annonces et du calendrier (décision du 06/11/2026) :
 * - toute l'école : chaque membre ;
 * - un cycle : le personnel de ce cycle (ou de toute l'école), l'enseignant de ce cycle, le parent d'un enfant qui y
 *   est inscrit ;
 * - une classe : le personnel de son cycle, son titulaire, les parents de ses élèves.
 *
 * @phpstan-type Scope array{staffAll: bool, staffCycles: list<string>, cycles: list<string>, classrooms: list<string>}
 */
final readonly class AudienceScope
{
    public function __construct(
        private Authorizer $authorizer,
        private TenantContext $context,
    ) {}

    /**
     * @return Scope
     */
    public function of(User $user, ?Carbon $now = null): array
    {
        $schoolId = $this->context->schoolId();
        $scope = ['staffAll' => false, 'staffCycles' => [], 'cycles' => [], 'classrooms' => []];
        if ($schoolId === null) {
            return $scope;
        }

        $guardian = false;
        foreach ($this->authorizer->assignments($user, $schoolId) as $assignment) {
            if ($assignment->role === Role::Guardian->value) {
                $guardian = true;

                continue;
            }
            if ($assignment->role === Role::Teacher->value) {
                if ($assignment->cycle_id !== null) {
                    $scope['cycles'][] = $assignment->cycle_id;
                }

                continue;
            }
            if ($assignment->cycle_id === null) {
                $scope['staffAll'] = true;
            } else {
                $scope['staffCycles'][] = $assignment->cycle_id;
                $scope['cycles'][] = $assignment->cycle_id;
            }
        }

        // Classes dont il est titulaire (année en cours)
        $year = AcademicYear::query()->where('is_current', true)->first();
        if ($year !== null) {
            Classroom::query()->where('academic_year_id', $year->id)->where('homeroom_teacher_id', $user->id)->with('level')->get()
                ->each(static function (Classroom $classroom) use (&$scope): void {
                    $scope['classrooms'][] = $classroom->id;
                    $scope['cycles'][] = $classroom->level->cycle_id;
                });
        }

        // Classes des enfants (parent : tuteur de même téléphone)
        if ($guardian) {
            $today = SchoolClock::date($now ?? Carbon::now());
            Student::query()
                ->whereHas('guardianLinks.guardian', static fn (Builder $q) => $q->where('phone', $user->phone))
                ->get()
                ->each(static function (Student $student) use (&$scope, $today): void {
                    $classroom = CurrentClassroom::of($student->id, $today);
                    if ($classroom !== null) {
                        $scope['classrooms'][] = $classroom->id;
                        $scope['cycles'][] = $classroom->level->cycle_id;
                    }
                });
        }

        return [
            'staffAll' => $scope['staffAll'],
            'staffCycles' => array_values(array_unique($scope['staffCycles'])),
            'cycles' => array_values(array_unique($scope['cycles'])),
            'classrooms' => array_values(array_unique($scope['classrooms'])),
        ];
    }
}
