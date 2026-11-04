<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

function runReservedSlugsMigration(): void
{
    // Comme `migrate --database=pgsql_owner` : la connexion par défaut est celle du rôle propriétaire
    DB::setDefaultConnection('pgsql_owner');

    $migration = require database_path('migrations/2026_11_06_100000_assert_no_reserved_school_slugs.php');
    if (! is_object($migration) || ! method_exists($migration, 'up')) {
        throw new LogicException('Migration introuvable');
    }

    $migration->up();
}

it('laisse passer les écoles dont le slug est libre', function (): void {
    makeSchool([], ['slug' => 'les-genies']);

    runReservedSlugsMigration();

    expect(true)->toBeTrue();
});

it('échoue et liste les écoles dont le slug est devenu réservé, sans rien renommer', function (): void {
    makeSchool([], ['slug' => 'connexion']);
    makeSchool([], ['slug' => 'les-genies']);

    expect(fn () => runReservedSlugsMigration())
        ->toThrow(RuntimeException::class, 'Slugs d’école réservés à renommer avant le déploiement : connexion');

    expect(DB::connection('pgsql_owner')->table('schools')->where('slug', 'connexion')->exists())->toBeTrue();
});
