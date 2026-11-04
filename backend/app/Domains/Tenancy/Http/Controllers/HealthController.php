<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Controllers;

use App\Domains\Tenancy\Actions\CheckSystemHealth;
use App\Domains\Tenancy\Http\Resources\HealthResource;
use Dedoc\Scramble\Attributes\Response;

final class HealthController
{
    /**
     * État de l'API.
     *
     * Vérifie la base de données et Redis. Répond 200 si tout est disponible, 503 sinon
     * (utilisé comme healthcheck par Railway au déploiement). Route publique, hors tenant.
     *
     * @unauthenticated
     */
    #[Response(200, 'La base de données et Redis répondent.', type: HealthResource::class)]
    #[Response(503, 'Au moins un composant est indisponible (aucun détail d\'erreur renvoyé).', type: HealthResource::class)]
    public function __invoke(CheckSystemHealth $checkSystemHealth): HealthResource
    {
        return new HealthResource($checkSystemHealth->handle());
    }
}
