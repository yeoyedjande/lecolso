<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Controllers\Platform;

use App\Domains\Tenancy\Actions\ListAllSchools;
use App\Domains\Tenancy\Http\Resources\SchoolResource;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ListSchoolsController
{
    /**
     * Tous les établissements (super-admin).
     *
     * Réservé aux super-admins (404 pour les autres). Lecture hors RLS par la connexion séparée app_platform.
     * Pagination par curseur, 50 écoles par page, triées par nom.
     */
    #[Response(200, 'Une page d’écoles, triées par nom.', type: 'AnonymousResourceCollection<Illuminate\Pagination\CursorPaginator<App\Domains\Tenancy\Http\Resources\SchoolResource>>')]
    #[Response(404, 'L’utilisateur n’est pas super-admin : la route n’est pas révélée.', type: 'array{message: string}')]
    public function __invoke(ListAllSchools $listAllSchools): AnonymousResourceCollection
    {
        return SchoolResource::collection($listAllSchools->handle());
    }
}
