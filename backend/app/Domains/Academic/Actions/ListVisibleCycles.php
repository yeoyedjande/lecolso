<?php

declare(strict_types=1);

namespace App\Domains\Academic\Actions;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Collection;

/**
 * Cycles de l'école courante que l'utilisateur peut voir : tous s'il a une affectation sans cycle,
 * sinon seulement ceux de ses affectations.
 */
final readonly class ListVisibleCycles
{
    public function __construct(
        private Authorizer $authorizer,
        private TenantContext $context,
    ) {}

    /**
     * @return Collection<int, Cycle>
     */
    public function handle(User $user): Collection
    {
        $schoolId = $this->context->schoolId() ?? throw new \LogicException('Aucune école courante.');
        $scope = $this->authorizer->cycleScope($user, $schoolId);

        return Cycle::query()
            ->with('levels')
            ->when($scope !== null, static fn ($query) => $query->whereIn('id', $scope ?? []))
            ->orderBy('position')
            ->get();
    }
}
