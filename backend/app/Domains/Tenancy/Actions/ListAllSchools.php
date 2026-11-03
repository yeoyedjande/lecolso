<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Actions;

use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\Platform;
use Illuminate\Contracts\Pagination\CursorPaginator;

/** Super-admin : tous les établissements de la plateforme (connexion app_platform, hors RLS). */
final class ListAllSchools
{
    /**
     * @return CursorPaginator<int, School>
     */
    public function handle(int $perPage = 50): CursorPaginator
    {
        return Platform::run(static fn (): CursorPaginator => School::query()
            ->orderBy('name')
            ->orderBy('id')
            ->cursorPaginate($perPage));
    }
}
