<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

use function Pest\Laravel\getJson;

it('répond 200 quand la base et Redis sont disponibles', function (): void {
    getJson('/api/v1/health')
        ->assertOk()
        ->assertExactJson([
            'status' => 'ok',
            'database' => 'ok',
            'redis' => 'ok',
        ]);
});

it('répond 503 sans détail d\'erreur quand la base est indisponible', function (): void {
    // Port fermé : la connexion PostgreSQL échoue immédiatement
    config(['database.connections.pgsql.port' => 1]);
    DB::purge('pgsql');

    getJson('/api/v1/health')
        ->assertServiceUnavailable()
        ->assertExactJson([
            'status' => 'error',
            'database' => 'error',
            'redis' => 'ok',
        ]);
});

it('répond 503 sans détail d\'erreur quand Redis est indisponible', function (): void {
    config(['database.redis.default.port' => 1]);
    Redis::purge('default');

    getJson('/api/v1/health')
        ->assertServiceUnavailable()
        ->assertExactJson([
            'status' => 'error',
            'database' => 'ok',
            'redis' => 'error',
        ]);
});

it('est accessible sans authentification ni établissement', function (): void {
    getJson('/api/v1/health', ['X-School-Id' => 'inconnu'])
        ->assertOk();
});
