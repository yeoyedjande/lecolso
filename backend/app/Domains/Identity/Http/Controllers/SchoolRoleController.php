<?php

declare(strict_types=1);

namespace App\Domains\Identity\Http\Controllers;

use App\Domains\Identity\Actions\CreateCustomRole;
use App\Domains\Identity\Actions\DeleteCustomRole;
use App\Domains\Identity\Actions\ListSchoolRoles;
use App\Domains\Identity\Actions\UpdateSchoolRole;
use App\Domains\Identity\Authorization\RoleCatalog;
use App\Domains\Identity\Http\Requests\DeleteSchoolRoleRequest;
use App\Domains\Identity\Http\Requests\StoreSchoolRoleRequest;
use App\Domains\Identity\Http\Requests\UpdateSchoolRoleRequest;
use App\Domains\Identity\Http\Requests\ViewSchoolRolesRequest;
use App\Domains\Identity\Http\Resources\PermissionResource;
use App\Domains\Identity\Http\Resources\SchoolRoleResource;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use LogicException;

final class SchoolRoleController
{
    public function __construct(private CurrentSchool $currentSchool) {}

    /**
     * Rôles de l'école.
     *
     * Rôles système (dans l'ordre : promoteur, direction, secrétariat, comptabilité, enseignant, parent) puis rôles
     * personnalisés par nom, avec leurs permissions et le nombre d'affectations. Qui gère les rôles ou voit les
     * utilisateurs.
     */
    public function index(ViewSchoolRolesRequest $request, ListSchoolRoles $listRoles): AnonymousResourceCollection
    {
        return SchoolRoleResource::collection($listRoles->handle($this->school()));
    }

    /**
     * Créer un rôle personnalisé.
     *
     * Permission roles.manage sur toute l'école. On ne peut accorder que des permissions que l'on détient sur
     * toute l'école (422 sinon), jamais une permission réservée aux parents.
     */
    public function store(StoreSchoolRoleRequest $request, CreateCustomRole $createRole): JsonResponse
    {
        $summary = $createRole->handle(
            $this->user($request),
            $this->school(),
            $request->name(),
            $request->description(),
            $request->permissions(),
        );

        return (new SchoolRoleResource($summary))->response()->setStatusCode(201);
    }

    /**
     * Modifier un rôle.
     *
     * Rôle personnalisé : nom, description, permissions. Rôle système modifiable (secrétariat, comptabilité) :
     * permissions seulement. Autre rôle système : 409 `role_locked`. 404 si le rôle n'existe pas dans l'école.
     */
    public function update(UpdateSchoolRoleRequest $request, UpdateSchoolRole $updateRole): SchoolRoleResource
    {
        return new SchoolRoleResource($updateRole->handle(
            $this->user($request),
            $this->school(),
            $request->roleKey(),
            $request->name(),
            $request->description(),
            $request->hasDescription(),
            $request->permissions(),
        ));
    }

    /**
     * Supprimer un rôle personnalisé.
     *
     * 409 `role_in_use` s'il est encore attribué, 409 `role_locked` pour un rôle système, 404 s'il n'existe pas
     * dans l'école.
     */
    public function destroy(DeleteSchoolRoleRequest $request, string $role, DeleteCustomRole $deleteRole): JsonResponse
    {
        $deleteRole->handle($role);

        return new JsonResponse(null, 204);
    }

    /**
     * Catalogue des permissions.
     *
     * Toutes les permissions, groupées par module, pour l'écran des rôles.
     */
    public function permissions(ViewSchoolRolesRequest $request, RoleCatalog $catalog): AnonymousResourceCollection
    {
        return PermissionResource::collection(array_map(static fn (string $permission): array => [
            'key' => $permission,
            'group' => $catalog->group($permission),
            'staff_assignable' => ! $catalog->isGuardianOnly($permission),
        ], $catalog->permissions()));
    }

    private function school(): School
    {
        return $this->currentSchool->get() ?? throw new LogicException('Route d’école sans école courante (middleware school).');
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        if (! $user instanceof User) {
            throw new AuthenticationException;
        }

        return $user;
    }
}
