<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Level;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\Platform;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

it('utilise un rôle de connexion séparé app_platform, BYPASSRLS mais pas superutilisateur', function (): void {
    $platform = DB::connection(Platform::CONNECTION);

    expect(array_map(
        static fn (mixed $row): array => (array) $row,
        $platform->select('select rolname, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb from pg_roles where rolname = current_user'),
    ))->toBe([[
        'rolname' => 'app_platform',
        'rolsuper' => false,
        'rolbypassrls' => true,
        'rolcreaterole' => false,
        'rolcreatedb' => false,
    ]])
        ->and($platform->scalar("select has_schema_privilege('public', 'CREATE')"))->toBeFalse();
});

it('empêche app_user d’endosser le rôle app_platform', function (): void {
    expect(DB::scalar("select pg_has_role('app_user', 'app_platform', 'MEMBER')"))->toBeFalse()
        ->and(DB::scalar("select pg_has_role('app_user', 'app_platform', 'USAGE')"))->toBeFalse()
        ->and(DB::scalar("select pg_has_role('app_user', 'app_platform', 'SET')"))->toBeFalse()
        ->and(static fn () => DB::statement('SET ROLE app_platform'))
        ->toThrow(QueryException::class, 'permission denied');
});

it('voit toutes les écoles et toutes les données dans Platform::run', function (): void {
    makeSchool(null);
    makeSchool(null);

    [$schools, $levels] = Platform::run(static fn (): array => [
        School::query()->count(),
        Level::query()->count(),
    ]);

    expect($schools)->toBe(2)->and($levels)->toBe(20);
});

it('bascule la connexion par défaut pendant Platform::run puis la rétablit', function (): void {
    makeSchool();

    $during = Platform::run(static fn (): array => [
        DB::getDefaultConnection(),
        DB::scalar('select current_user'),
        Platform::active(),
    ]);

    expect($during)->toBe([Platform::CONNECTION, 'app_platform', true])
        ->and(DB::getDefaultConnection())->toBe(TenantContext::CONNECTION)
        ->and(DB::scalar('select current_user'))->toBe('app_user')
        ->and(Platform::active())->toBeFalse()
        ->and(DB::scalar('select count(*) from schools'))->toBe(0);
});

it('rétablit la connexion précédente et annule la transaction après une exception', function (): void {
    $school = makeSchool();

    expect(static fn () => Platform::run(static function () use ($school): never {
        School::query()->whereKey($school->id)->update(['city' => 'Annulé']);

        throw new RuntimeException('échec simulé');
    }))->toThrow(RuntimeException::class, 'échec simulé');

    expect(DB::getDefaultConnection())->toBe(TenantContext::CONNECTION)
        ->and(Platform::active())->toBeFalse()
        ->and(DB::scalar('select current_user'))->toBe('app_user')
        ->and(Platform::run(static fn (): ?string => School::query()->findOrFail($school->id)->city))->toBe('Abidjan');
});
