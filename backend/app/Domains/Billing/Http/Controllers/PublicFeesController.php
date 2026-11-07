<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Controllers;

use App\Domains\Billing\Actions\ShowPublicFees;
use App\Domains\Billing\Http\Resources\PublicFeeGridResource;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class PublicFeesController
{
    /**
     * Tarifs publics d'une école.
     *
     * Sans connexion. Grille de l'année en cours si l'école a choisi de la publier, sinon `data: null`.
     * 404 : école inconnue.
     *
     * @response array{data: PublicFeeGridResource|null}
     */
    public function __invoke(string $slug, ShowPublicFees $fees): JsonResponse
    {
        $grid = $fees->handle($slug) ?? throw new NotFoundHttpException;

        return new JsonResponse(['data' => $grid === false ? null : (new PublicFeeGridResource($grid))->resolve()]);
    }
}
