<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domains\Tenancy\Models\School;
use App\Domains\Tenancy\Policies\SchoolPolicy;
use App\Support\Tenancy\CurrentSchool;
use App\Support\Tenancy\TenantContext;
use Illuminate\Queue\Events\JobExceptionOccurred;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Queue\Events\JobProcessed;
use Illuminate\Queue\Events\JobProcessing;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

final class TenancyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // « scoped » : nouvelle instance à chaque requête et avant chaque job (vidée par Laravel)
        $this->app->scoped(CurrentSchool::class);
        $this->app->scoped(TenantContext::class);
    }

    public function boot(): void
    {
        Gate::policy(School::class, SchoolPolicy::class);

        // Workers Horizon (processus longs, connexion réutilisée) : aucun contexte ne passe d'un job à l'autre,
        // qu'il réussisse, échoue ou lève une exception. Avant le job aussi : rien n'hérite du job précédent.
        Event::listen(
            [JobProcessing::class, JobProcessed::class, JobFailed::class, JobExceptionOccurred::class],
            function (): void {
                $this->app->make(TenantContext::class)->clear();
            },
        );
    }
}
