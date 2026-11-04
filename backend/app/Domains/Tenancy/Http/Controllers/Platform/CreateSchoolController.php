<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Controllers\Platform;

use App\Domains\Tenancy\Actions\CreateSchool;
use App\Domains\Tenancy\Http\Requests\CreateSchoolRequest;
use App\Domains\Tenancy\Http\Resources\SchoolResource;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;

final class CreateSchoolController
{
    /**
     * Créer une école (super-admin)
     *
     * Ouvre les cycles choisis (catalogue) et rattache le directeur. Si le directeur n'a pas encore de compte,
     * il est créé avec un mot de passe provisoire, renvoyé une seule fois et à changer à la première connexion.
     * Réservé aux super-admins (404 pour les autres).
     */
    #[Response(201, 'École créée.', type: 'array{data: App\Domains\Tenancy\Http\Resources\SchoolResource, director: array{id: string, name: string, phone: string, provisional_password: string|null}}')]
    #[Response(404, 'L’utilisateur n’est pas super-admin : la route n’est pas révélée.', type: 'array{message: string}')]
    public function __invoke(CreateSchoolRequest $request, CreateSchool $createSchool): JsonResponse
    {
        $created = $createSchool->handle($request->toData());

        return (new SchoolResource($created->school))
            ->additional([
                'director' => [
                    'id' => $created->director->id,
                    'name' => $created->director->name,
                    'phone' => $created->director->phone,
                    'provisional_password' => $created->provisionalPassword,
                ],
            ])
            ->response()
            ->setStatusCode(201);
    }
}
