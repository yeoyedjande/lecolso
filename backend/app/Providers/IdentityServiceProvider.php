<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Academic\Policies\CyclePolicy;
use App\Domains\Identity\Auth\RlsUserProvider;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\SchoolRole;
use App\Domains\Identity\Models\User;
use App\Domains\Identity\Policies\SchoolRolePolicy;
use App\Domains\Identity\Policies\UserPolicy;
use App\Domains\Messaging\Contracts\SmsSender;
use App\Domains\Messaging\Sms\FakeSmsSender;
use App\Domains\Messaging\Sms\UnconfiguredSmsSender;
use App\Support\Tenancy\TenantContext;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Contracts\Hashing\Hasher;
use Illuminate\Database\DatabaseManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Psr\Log\LoggerInterface;

final class IdentityServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Pas de fournisseur SMS réel en V1 : factice en local et en test, refus explicite en production
        $this->app->singleton(SmsSender::class, static fn (Application $app): SmsSender => $app->environment('production')
            ? new UnconfiguredSmsSender
            : new FakeSmsSender($app->make(LoggerInterface::class)));
    }

    public function boot(): void
    {
        // Fournisseur d'utilisateurs « rls » : pose app.user_id avant de charger un utilisateur (config/auth.php)
        Auth::provider('rls', static fn (Application $app): RlsUserProvider => new RlsUserProvider(
            $app->make(Hasher::class),
            $app->make(TenantContext::class),
            $app->make(DatabaseManager::class),
        ));

        // Liaison explicite des paramètres de route : résolue après ResolveSchool, donc sous la RLS de l'école
        // courante (un modèle d'une autre école est introuvable : 404)
        Route::model('user', User::class);
        Route::model('cycle', Cycle::class);
        Route::model('assignment', RoleAssignment::class);

        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Cycle::class, CyclePolicy::class);
        Gate::policy(SchoolRole::class, SchoolRolePolicy::class);

        // Connexion : 5 tentatives par minute pour un même identifiant ET 20 par minute pour une même adresse IP
        RateLimiter::for('login', static function (Request $request): array {
            $login = $request->input('login');
            $key = is_string($login) ? (RlsUserProvider::normalizeLogin($login) ?? Str::lower(trim($login))) : '';
            $tooMany = static fn (Request $request, array $headers): JsonResponse => new JsonResponse([
                'message' => 'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
                'code' => 'too_many_attempts',
            ], 429, $headers);

            return [
                Limit::perMinute(5)->by('login:'.hash('sha256', $key))->response($tooMany),
                Limit::perMinute(20)->by('login-ip:'.$request->ip())->response($tooMany),
            ];
        });
    }
}
