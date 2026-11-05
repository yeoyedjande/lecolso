<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\AssignUserRole;
use App\Domains\Identity\Actions\CreateSchoolUser;
use App\Domains\Identity\Actions\ListSchoolUsers;
use App\Domains\Identity\Actions\PresentSchoolUser;
use App\Domains\Identity\Actions\RemoveSchoolUser;
use App\Domains\Identity\Actions\RevokeUserRole;
use App\Domains\Identity\Actions\SetSchoolUserActive;
use App\Domains\Identity\Actions\UpdateSchoolUser;
use App\Domains\Identity\Http\Requests\AssignUserRoleRequest;
use App\Domains\Identity\Http\Requests\ListSchoolUsersRequest;
use App\Domains\Identity\Http\Requests\ManageSchoolUserRequest;
use App\Domains\Identity\Http\Requests\RevokeUserRoleRequest;
use App\Domains\Identity\Http\Requests\ShowSchoolUserRequest;
use App\Domains\Identity\Http\Requests\StoreSchoolUserRequest;
use App\Domains\Identity\Http\Requests\UpdateSchoolUserRequest;
use App\Domains\Identity\Http\Resources\SchoolUserResource;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use LogicException;

final class SchoolUserController
{
    public function __construct(
        private CurrentSchool $currentSchool,
        private PresentSchoolUser $present,
    ) {}

    /**
     * Comptes de l'école.
     *
     * Par nom, 25 par page (curseur). Permission users.view ; limitée à un cycle, seuls les comptes de ce cycle.
     */
    public function index(ListSchoolUsersRequest $request, ListSchoolUsers $listUsers): AnonymousResourceCollection
    {
        return SchoolUserResource::collection($listUsers->handle(
            $this->user($request),
            $this->school(),
            $request->search(),
            $request->role(),
            $request->cycleId(),
            $request->status(),
        ));
    }

    /**
     * Un compte de l'école.
     *
     * 404 s'il n'est pas membre de l'école.
     */
    public function show(ShowSchoolUserRequest $request): SchoolUserResource
    {
        return $this->resource($request, $request->target());
    }

    /**
     * Ajouter un compte.
     *
     * Avec au moins un rôle. Téléphone inconnu : nouveau compte et mot de passe provisoire (`provisional_password`,
     * renvoyé une seule fois). Téléphone d'un compte d'une autre école : rattaché, il garde son mot de passe
     * (`provisional_password` null). Chaque rôle exige le droit de l'attribuer (cycle, hiérarchie, pas d'élévation).
     */
    public function store(StoreSchoolUserRequest $request, CreateSchoolUser $createUser): JsonResponse
    {
        $created = $createUser->handle($this->user($request), $this->school(), $request->newUser());

        return (new SchoolUserResource($created->user))
            ->additional(['provisional_password' => $created->provisionalPassword])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Modifier un compte.
     *
     * Nom, téléphone, e-mail (uniques entre tous les comptes). Jamais son propre compte ; un promoteur seulement par
     * un promoteur.
     */
    public function update(UpdateSchoolUserRequest $request, UpdateSchoolUser $updateUser): SchoolUserResource
    {
        $user = $updateUser->handle(
            $request->target(),
            $request->name(),
            $request->phone(),
            $request->email(),
            $request->hasEmail(),
        );

        return $this->resource($request, $user);
    }

    /**
     * Attribuer un rôle.
     *
     * Rôle système ou personnalisé, sur un cycle ou toute l'école. Promoteur et Direction : par un promoteur
     * seulement ; jamais un rôle dont on ne détient pas toutes les permissions sur ce cycle.
     */
    public function assignRole(AssignUserRoleRequest $request, AssignUserRole $assignRole): SchoolUserResource
    {
        $assignRole->handle($this->school(), $request->target()->id, $request->role(), $request->cycleId());

        return $this->resource($request, $request->target());
    }

    /**
     * Retirer un rôle.
     *
     * 409 `last_role` pour le dernier rôle du compte (le supprimer ou le désactiver).
     */
    public function revokeRole(RevokeUserRoleRequest $request, RevokeUserRole $revokeRole): SchoolUserResource
    {
        $revokeRole->handle($request->assignment());

        return $this->resource($request, $request->target());
    }

    /**
     * Désactiver un compte.
     *
     * Son accès à l'école est coupé dès la requête suivante ; ses rôles sont conservés.
     */
    public function deactivate(ManageSchoolUserRequest $request, SetSchoolUserActive $setActive): SchoolUserResource
    {
        $setActive->handle($this->user($request), $request->target(), false);

        return $this->resource($request, $request->target());
    }

    /** Réactiver un compte. */
    public function reactivate(ManageSchoolUserRequest $request, SetSchoolUserActive $setActive): SchoolUserResource
    {
        $setActive->handle($this->user($request), $request->target(), true);

        return $this->resource($request, $request->target());
    }

    /**
     * Supprimer un compte de l'école.
     *
     * Retire tous ses rôles. Le compte n'est effacé (`erased`) que s'il n'appartient à aucune autre école.
     */
    public function destroy(ManageSchoolUserRequest $request, RemoveSchoolUser $removeUser): JsonResponse
    {
        return new JsonResponse(['erased' => $removeUser->handle($request->target())]);
    }

    private function resource(Request $request, User $user): SchoolUserResource
    {
        return new SchoolUserResource($this->present->one($this->user($request), $this->school(), $user));
    }

    private function school(): School
    {
        return $this->currentSchool->get() ?? throw new LogicException('Route d’école sans école courante (middleware school).');
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
