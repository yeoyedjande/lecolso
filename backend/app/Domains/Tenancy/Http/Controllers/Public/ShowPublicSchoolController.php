<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Controllers\Public;

use App\Domains\Tenancy\Actions\FindPublicSchool;
use App\Domains\Tenancy\Http\Resources\PublicSchoolResource;
use Dedoc\Scramble\Attributes\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class ShowPublicSchoolController
{
    /**
     * Page publique d'une école
     *
     * Sans authentification : nom, ville, type et cycles ouverts (avec leurs niveaux). Aucune donnée personnelle.
     */
    #[Response(404, 'Aucune école avec ce slug.', type: 'array{message: string}')]
    public function __invoke(string $slug, FindPublicSchool $findPublicSchool): PublicSchoolResource
    {
        $profile = $findPublicSchool->handle($slug);

        if ($profile === null) {
            throw new NotFoundHttpException;
        }

        return new PublicSchoolResource($profile);
    }
}
