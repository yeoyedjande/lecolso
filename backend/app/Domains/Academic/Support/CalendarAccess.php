<?php

declare(strict_types=1);

namespace App\Domains\Academic\Support;

use App\Domains\Academic\Models\SchoolEvent;
use App\Domains\Identity\Authorization\StaffScope;
use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Support\AudienceScope;
use Illuminate\Database\Eloquent\Builder;

/**
 * Calendrier de l'école (décision du 06/11/2026) : géré par la direction (school.settings.manage, toute l'école pour
 * un événement de toute l'école, le cycle sinon) ; lu par chaque membre pour toute l'école et par ceux du cycle
 * (personnel, enseignants, parents d'un enfant du cycle) pour un cycle : AudienceScope.
 */
final readonly class CalendarAccess
{
    public function __construct(
        private StaffScope $staff,
        private AudienceScope $audiences,
    ) {}

    public function canManage(User $user, ?string $cycleId): bool
    {
        $cycles = $this->staff->cycles($user, 'school.settings.manage');

        return $cycles === null || ($cycleId !== null && in_array($cycleId, $cycles, true));
    }

    /**
     * @return Builder<SchoolEvent>
     */
    public function visible(User $user): Builder
    {
        $scope = $this->audiences->of($user);

        return SchoolEvent::query()->where(static function (Builder $where) use ($scope): void {
            $where->whereNull('cycle_id');
            if ($scope['staffAll']) {
                $where->orWhereRaw('true');

                return;
            }
            $where->orWhereIn('cycle_id', $scope['cycles']);
        });
    }
}
