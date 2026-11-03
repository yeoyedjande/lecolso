<?php

declare(strict_types=1);

use App\Domains\Identity\Enums\Role;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\getJson;

it('liste toutes les écoles pour un super-admin', function (): void {
    makeSchool();
    makeSchool();
    makeSchool();
    Sanctum::actingAs(superAdmin());

    getJson('/api/v1/platform/schools')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'organization_id', 'name', 'slug', 'type', 'city', 'currency', 'created_at']],
            'meta' => ['next_cursor'],
        ]);
});

it('répond 404 à un utilisateur qui n’est pas super-admin, même directeur', function (): void {
    $school = makeSchool();
    $director = makeUser();
    assignRole($director, $school, Role::Director);
    Sanctum::actingAs($director);

    getJson('/api/v1/platform/schools')->assertNotFound();
    getJson('/api/v1/platform/schools', ['X-School-Id' => $school->id])->assertNotFound();
});

it('répond 401 sans authentification', function (): void {
    getJson('/api/v1/platform/schools')->assertUnauthorized();
});

it('rend la main à la connexion applicative après la requête super-admin', function (): void {
    makeSchool();
    Sanctum::actingAs(superAdmin());

    getJson('/api/v1/platform/schools')->assertOk();

    expect(DB::getDefaultConnection())->toBe('pgsql')
        ->and(DB::scalar('select current_user'))->toBe('app_user')
        ->and(DB::scalar('select count(*) from schools'))->toBe(0);
});
