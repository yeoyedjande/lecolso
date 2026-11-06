<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Support;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Authorization\StaffScope;
use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Data\AnnouncementTargets;
use App\Domains\Messaging\Enums\AnnouncementAudience;
use App\Domains\Messaging\Models\Announcement;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;

/**
 * Qui publie une annonce (décision du 06/11/2026) : direction et secrétariat (messaging.announce, hors rôles Parent et
 * Enseignant) pour toute l'école (affectation sans cycle), pour leur cycle ou une classe de leur cycle ; le titulaire
 * pour sa classe (messaging.send). Même droit pour retirer une annonce. Qui la lit : AudienceScope.
 */
final readonly class AnnouncementAccess
{
    public function __construct(
        private Authorizer $authorizer,
        private StaffScope $staff,
        private TenantContext $context,
        private AudienceScope $audiences,
    ) {}

    public function canPublish(User $user, AnnouncementAudience $audience, ?string $cycleId, ?Classroom $classroom): bool
    {
        $cycles = $this->staff->cycles($user, 'messaging.announce');

        return match ($audience) {
            AnnouncementAudience::School => $cycles === null,
            AnnouncementAudience::Cycle => $cycleId !== null && ($cycles === null || in_array($cycleId, $cycles, true)),
            AnnouncementAudience::Classroom => $classroom !== null && (
                $cycles === null
                || in_array($classroom->level->cycle_id, $cycles, true)
                || $this->isHomeroom($user, $classroom)
            ),
        };
    }

    public function canDelete(User $user, Announcement $announcement): bool
    {
        $announcement->loadMissing('classroom.level');

        return $this->canPublish($user, $announcement->audience, $announcement->cycle_id, $announcement->classroom);
    }

    /**
     * Annonces que l'utilisateur lit (toute l'école, ses cycles, ses classes).
     *
     * @return Builder<Announcement>
     */
    public function visible(User $user): Builder
    {
        $scope = $this->audiences->of($user);

        return Announcement::query()->where(static function (Builder $where) use ($scope): void {
            $where->where('audience', AnnouncementAudience::School);
            if ($scope['staffAll']) {
                $where->orWhereRaw('true');

                return;
            }
            $where->orWhere(static fn (Builder $q) => $q->where('audience', AnnouncementAudience::Cycle)->whereIn('cycle_id', $scope['cycles']))
                ->orWhere(static fn (Builder $q) => $q->where('audience', AnnouncementAudience::Classroom)->where(
                    static fn (Builder $c) => $c->whereIn('cycle_id', $scope['staffCycles'])->orWhereIn('classroom_id', $scope['classrooms']),
                ));
        });
    }

    /**
     * Publics que l'utilisateur peut viser : toute l'école, cycles, classes de l'année en cours.
     */
    public function targets(User $user): AnnouncementTargets
    {
        $cycles = $this->staff->cycles($user, 'messaging.announce');
        $year = AcademicYear::query()->where('is_current', true)->first();
        $classrooms = $year === null ? [] : Classroom::query()->where('academic_year_id', $year->id)->with('level.cycle')->get()
            ->filter(fn (Classroom $classroom): bool => $this->canPublish($user, AnnouncementAudience::Classroom, $classroom->level->cycle_id, $classroom))
            ->sortBy(static fn (Classroom $classroom): string => sprintf('%03d-%03d-%s', $classroom->level->cycle->position, $classroom->level->position, $classroom->section))
            ->values()
            ->all();

        return new AnnouncementTargets(
            $cycles === null,
            Cycle::query()->where('is_active', true)
                ->when($cycles !== null, static fn (Builder $q) => $q->whereIn('id', $cycles ?? []))
                ->orderBy('position')->get()->values()->all(),
            $classrooms,
        );
    }

    private function isHomeroom(User $user, Classroom $classroom): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null
            && $classroom->homeroom_teacher_id === $user->id
            && $this->authorizer->allows($user, 'messaging.send', $schoolId, $classroom->level->cycle_id);
    }
}
