<?php

declare(strict_types=1);

namespace App\Support\Routing;

use Illuminate\Support\Facades\Route;

/**
 * Charge le fichier routes.php de chaque domaine (app/Domains/<Domaine>/routes.php)
 * sous le préfixe /api/v1 et le groupe de middleware « api ».
 *
 * Appelé depuis bootstrap/app.php (withRouting(then: ...)) : Laravel 11+ n'a plus de RouteServiceProvider.
 */
final class DomainRoutes
{
    public const string PREFIX = 'api/v1';

    public static function register(): void
    {
        foreach (self::files() as $file) {
            Route::middleware('api')
                ->prefix(self::PREFIX)
                ->group($file);
        }
    }

    /**
     * Fichiers de routes des domaines, triés pour un ordre de chargement stable.
     *
     * @return list<string>
     */
    public static function files(): array
    {
        $files = glob(app_path('Domains/*/routes.php'));

        if ($files === false) {
            return [];
        }

        sort($files);

        return $files;
    }
}
