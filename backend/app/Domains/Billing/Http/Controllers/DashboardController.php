<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Controllers;

use App\Domains\Billing\Actions\BuildDashboard;
use App\Domains\Billing\Http\Requests\DashboardRequest;
use App\Domains\Billing\Http\Resources\DashboardResource;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Carbon;

/** Tableau de bord de l'établissement. */
final class DashboardController
{
    /**
     * Chiffres du tableau de bord.
     *
     * Année en cours, cycles de l'utilisateur : effectifs ; finances avec `billing.view` (sinon `finance` null).
     */
    public function show(DashboardRequest $request, BuildDashboard $build): DashboardResource
    {
        $user = $request->user();

        return new DashboardResource($build->handle($user instanceof User ? $user : throw new AuthenticationException, Carbon::now()));
    }
}
