<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Authorization\RoleCatalog;
use App\Domains\Identity\Data\SchoolRoleSummary;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Tenancy\Models\School;

/** Rôles effectifs de l'école courante, avec le nombre d'affectations de chacun. */
final readonly class ListSchoolRoles
{
    public function __construct(private RoleCatalog $catalog) {}

    /**
     * Relit la base à chaque appel.
     *
     * @return list<SchoolRoleSummary>
     *
     * @phpstan-impure
     */
    public function handle(School $school): array
    {
        /** @var array<string, int> $counts */
        $counts = RoleAssignment::query()
            ->selectRaw('role, count(*) as total')
            ->groupBy('role')
            ->pluck('total', 'role')
            ->map(static fn (mixed $total): int => is_numeric($total) ? (int) $total : 0)
            ->all();

        $summaries = [];
        foreach ($this->catalog->rolesOf($school) as $key => $role) {
            $summaries[] = new SchoolRoleSummary($role, $counts[$key] ?? 0);
        }

        return $summaries;
    }

    /**
     * Relit la base à chaque appel (état après une écriture).
     *
     * @phpstan-impure
     */
    public function find(School $school, string $key): ?SchoolRoleSummary
    {
        foreach ($this->handle($school) as $summary) {
            if ($summary->role->key === $key) {
                return $summary;
            }
        }

        return null;
    }
}
