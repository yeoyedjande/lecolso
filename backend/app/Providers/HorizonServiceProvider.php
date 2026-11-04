<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domains\Identity\Models\User;
use Illuminate\Support\Facades\Gate;
use Laravel\Horizon\HorizonApplicationServiceProvider;

class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        parent::boot();
    }

    /**
     * Register the Horizon gate.
     *
     * This gate determines who can access Horizon in non-local environments.
     */
    protected function gate(): void
    {
        // Tableau de bord fermé à tous hors environnement local, en attendant le rôle super_admin (sprint 0, étape 4)
        Gate::define('viewHorizon', static fn (?User $user = null): bool => false);
    }
}
