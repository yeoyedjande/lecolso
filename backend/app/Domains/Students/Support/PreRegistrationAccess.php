<?php

declare(strict_types=1);

namespace App\Domains\Students\Support;

use App\Domains\Identity\Authorization\StaffScope;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\PreRegistration;
use Illuminate\Database\Eloquent\Builder;

/**
 * Qui traite les pré-inscriptions : le personnel avec `students.manage` (secrétariat, direction) sur le cycle du
 * niveau demandé, ou sur toute l'école. Hors de ce périmètre : 404, comme une autre école.
 */
final readonly class PreRegistrationAccess
{
    public function __construct(private StaffScope $scope) {}

    public function any(User $user): bool
    {
        return $this->scope->cycles($user, 'students.manage') !== [];
    }

    public function sees(User $user, PreRegistration $preRegistration): bool
    {
        $cycles = $this->scope->cycles($user, 'students.manage');
        if ($cycles === null) {
            return true;
        }

        return in_array($preRegistration->level()->value('cycle_id'), $cycles, true);
    }

    /**
     * @param  Builder<PreRegistration>  $query
     * @return Builder<PreRegistration>
     */
    public function constrain(Builder $query, User $user): Builder
    {
        $cycles = $this->scope->cycles($user, 'students.manage');

        return $cycles === null ? $query : $query->whereHas('level', static fn (Builder $level) => $level->whereIn('cycle_id', $cycles));
    }
}
