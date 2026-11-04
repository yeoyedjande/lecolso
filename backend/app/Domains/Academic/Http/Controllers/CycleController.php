<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Controllers;

use App\Domains\Academic\Actions\ListVisibleCycles;
use App\Domains\Academic\Actions\UpdateCycle;
use App\Domains\Academic\Http\Requests\UpdateCycleRequest;
use App\Domains\Academic\Http\Resources\CycleResource;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class CycleController
{
    /**
     * Cycles de l'école.
     *
     * Avec leurs niveaux et paramètres. Un utilisateur limité à un cycle ne voit que celui-ci.
     */
    public function index(Request $request, ListVisibleCycles $listVisibleCycles): AnonymousResourceCollection
    {
        $user = $request->user();

        if (! $user instanceof User) {
            throw new AuthenticationException;
        }

        return CycleResource::collection($listVisibleCycles->handle($user));
    }

    /**
     * Modifier un cycle.
     *
     * Nom et/ou paramètres (fusionnés avec les paramètres actuels). Permission school.settings.manage
     * sur ce cycle (403 sinon) ; 404 si le cycle n'appartient pas à l'école.
     */
    public function update(UpdateCycleRequest $request, UpdateCycle $updateCycle): CycleResource
    {
        return new CycleResource($updateCycle->handle($request->cycle(), $request->name(), $request->settings()));
    }
}
