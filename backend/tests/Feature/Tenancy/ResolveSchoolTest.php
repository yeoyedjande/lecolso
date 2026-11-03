<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Enums\Role;
use App\Domains\Tenancy\Models\School;
use App\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\getJson;

beforeEach(function (): void {
    // Route de test : ce que voit une route d'établissement (contexte PHP, variable PostgreSQL, données)
    Route::middleware(['api', 'auth:sanctum', 'school'])->get('/api/v1/_test/context', static fn (): array => [
        'school_id' => app(TenantContext::class)->schoolId(),
        'pg_school_id' => DB::scalar("select current_setting('app.school_id', true)"),
        'cycles' => Cycle::query()->orderBy('position')->pluck('code'),
        'raw_levels' => DB::scalar('select count(*) from levels'),
    ]);
});

/**
 * Une école où l'utilisateur est secrétaire (garderie + maternelle) et une école où il n'a rien.
 *
 * @return array{0: User, 1: School, 2: School}
 */
function memberAndSchools(): array
{
    $member = makeSchool(['daycare', 'kindergarten']);
    $other = makeSchool(null);
    $user = makeUser();
    assignRole($user, $member, Role::Secretary);

    return [$user, $member, $other];
}

it('résout l’école d’un utilisateur qui y a une affectation', function (): void {
    [$user, $school] = memberAndSchools();
    Sanctum::actingAs($user);

    getJson('/api/v1/_test/context', ['X-School-Id' => $school->id])
        ->assertOk()
        ->assertExactJson([
            'school_id' => $school->id,
            'pg_school_id' => $school->id,
            'cycles' => ['daycare', 'kindergarten'],
            'raw_levels' => 4,
        ]);
});

it('répond 404 pour une école existante où l’utilisateur n’a aucune affectation', function (): void {
    [$user, , $other] = memberAndSchools();
    Sanctum::actingAs($user);

    getJson('/api/v1/_test/context', ['X-School-Id' => $other->id])->assertNotFound();
});

it('répond 404 pour une école inexistante, comme pour une école d’autrui', function (): void {
    [$user] = memberAndSchools();
    Sanctum::actingAs($user);

    getJson('/api/v1/_test/context', ['X-School-Id' => (string) Str::uuid7()])->assertNotFound();
});

it('répond 400 quand l’en-tête X-School-Id est absent ou mal formé', function (?string $header): void {
    [$user] = memberAndSchools();
    Sanctum::actingAs($user);

    getJson('/api/v1/_test/context', $header === null ? [] : ['X-School-Id' => $header])
        ->assertBadRequest()
        ->assertJsonPath('code', 'school_header_invalid');
})->with([
    'absent' => [null],
    'vide' => [''],
    'pas un uuid' => ['ecole-a'],
    'injection' => ["' or 1=1 --"],
]);

it('répond 401 sans authentification', function (): void {
    [, $school] = memberAndSchools();

    getJson('/api/v1/_test/context', ['X-School-Id' => $school->id])->assertUnauthorized();
});

it('remet le contexte à zéro après la requête, réussie ou refusée', function (): void {
    [$user, $school, $other] = memberAndSchools();
    Sanctum::actingAs($user);

    getJson('/api/v1/_test/context', ['X-School-Id' => $school->id])->assertOk();

    expect(app(TenantContext::class)->schoolId())->toBeNull()
        ->and(DB::scalar("select current_setting('app.school_id', true)"))->toBe('')
        ->and(DB::scalar("select current_setting('app.user_id', true)"))->toBe('')
        ->and(DB::scalar('select count(*) from levels'))->toBe(0);

    getJson('/api/v1/_test/context', ['X-School-Id' => $other->id])->assertNotFound();

    expect(DB::scalar("select current_setting('app.school_id', true)"))->toBe('')
        ->and(DB::scalar('select count(*) from schools'))->toBe(0);
});
