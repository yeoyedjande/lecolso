<?php

declare(strict_types=1);

namespace App\Support\Tenancy;

use Illuminate\Support\Facades\DB;

/**
 * Accès super-admin : seule porte d'entrée vers la connexion pgsql_platform (rôle de connexion séparé
 * app_platform, BYPASSRLS). app_user ne peut pas endosser ce rôle : une injection SQL sur la connexion
 * applicative ne permet donc pas de contourner la RLS.
 *
 * Usage limité (test d'architecture) aux Actions des routes /api/v1/platform/* (middleware EnsureSuperAdmin)
 * et aux factories de test. Les modèles chargés ici gardent la connexion pgsql_platform : ne pas les
 * réutiliser pour écrire hors de Platform::run().
 */
final class Platform
{
    public const string CONNECTION = 'pgsql_platform';

    private static int $depth = 0;

    /**
     * Bascule la connexion par défaut sur pgsql_platform, exécute $callback dans une transaction,
     * puis rétablit la connexion précédente (finally : même après une exception).
     *
     * @template TResult
     *
     * @param  callable(): TResult  $callback
     * @return TResult
     */
    public static function run(callable $callback): mixed
    {
        $previous = DB::getDefaultConnection();

        DB::setDefaultConnection(self::CONNECTION);
        self::$depth++;

        try {
            return DB::connection(self::CONNECTION)->transaction(static fn (): mixed => $callback());
        } finally {
            self::$depth--;
            DB::setDefaultConnection($previous);
        }
    }

    public static function active(): bool
    {
        return self::$depth > 0;
    }
}
