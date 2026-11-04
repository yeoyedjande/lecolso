<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\SchoolRole;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\Platform;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;
use Tests\Support\SpaClient;
use Tests\TestCase;

// Tous les tests (Feature et Unit) démarrent l'application Laravel ; base vidée avant chaque test (TestCase)
pest()->extend(TestCase::class)->in('Feature', 'Unit');

/**
 * École de test, créée par la connexion super-admin puis rebasculée sur la connexion applicative.
 *
 * @param  list<string>|null  $cycles  cycles du catalogue à ouvrir ; null = tous ; [] = aucun
 * @param  array<string, mixed>  $attributes
 */
function makeSchool(?array $cycles = [], array $attributes = []): School
{
    $factory = $cycles === [] ? School::factory() : School::factory()->withCycles($cycles);

    return $factory->createOne($attributes);
}

/**
 * Lignes d'une requête SQL brute, sous forme de tableaux associatifs.
 *
 * @param  array<int, mixed>  $bindings
 * @return list<array<array-key, mixed>>
 */
function rows(string $sql, array $bindings = []): array
{
    return array_values(array_map(
        static fn (mixed $row): array => (array) $row,
        DB::select($sql, $bindings),
    ));
}

/**
 * Valeurs distinctes et triées d'une colonne texte (identifiants), en SQL brut.
 *
 * @param  array<int, mixed>  $bindings
 * @return list<string>
 */
function distinctColumn(string $column, string $sql, array $bindings = []): array
{
    $values = array_map(
        static fn (mixed $value): string => is_string($value) ? $value : get_debug_type($value),
        array_column(rows($sql, $bindings), $column),
    );
    $values = array_values(array_unique($values));
    sort($values);

    return $values;
}

/**
 * Exécute $callback dans le contexte de $school (variable PostgreSQL app.school_id + CurrentSchool),
 * puis rétablit le contexte précédent.
 *
 * @template TResult
 *
 * @param  callable(): TResult  $callback
 * @return TResult
 */
function inSchool(School $school, callable $callback): mixed
{
    return app(TenantContext::class)->run($school, $callback);
}

function makeUser(): User
{
    return User::factory()->createOne();
}

function superAdmin(): User
{
    $user = makeUser();

    // is_super_admin n'est ni assignable en masse ni modifiable par app_user : écriture super-admin explicite
    Platform::run(static fn (): int => User::query()->whereKey($user->id)->update(['is_super_admin' => true]));
    $user->forceFill(['is_super_admin' => true])->syncOriginal();

    return $user;
}

/**
 * Requête du frontend (cookie de session, en-tête Origin), avec l'école courante si fournie.
 *
 * @param  array<array-key, mixed>  $data  corps JSON
 * @param  array<string, string>  $server
 * @return TestResponse<Response>
 */
function spa(string $method, string $uri, array $data = [], ?School $school = null, array $server = []): TestResponse
{
    return SpaClient::request($method, $uri, $data, $school === null ? [] : ['X-School-Id' => $school->id], $server);
}

/**
 * Connexion réelle par POST /api/v1/auth/login (session par cookie).
 *
 * @return TestResponse<Response>
 */
function login(User $user, string $password = 'password', bool $remember = false): TestResponse
{
    return spa('POST', '/api/v1/auth/login', ['login' => $user->phone, 'password' => $password, 'remember' => $remember]);
}

/** Utilisateur affecté à $school (toute l'école, ou un cycle) et connecté par session. */
function actingAsRole(Role|string $role, School $school, ?Cycle $cycle = null): User
{
    $user = makeUser();
    assignRole($user, $school, $role, $cycle);
    login($user)->assertOk();

    return $user;
}

/**
 * Rôle personnalisé créé dans une école (sa clé d'affectation est son identifiant).
 *
 * @param  list<string>  $permissions
 */
function customRole(School $school, array $permissions, string $name = 'Surveillant général'): SchoolRole
{
    return inSchool($school, static fn (): SchoolRole => SchoolRole::factory()->createOne([
        'name' => $name,
        'permissions' => $permissions,
    ]));
}

/** Cycle d'une école à partir de son code de catalogue (lu dans le contexte de l'école). */
function cycleOf(School $school, string $code): Cycle
{
    return inSchool($school, static fn (): Cycle => Cycle::query()->where('code', $code)->firstOrFail());
}

/** Affecte un rôle à un utilisateur dans une école (toute l'école, ou un cycle) : rôle système ou clé d'un rôle personnalisé. */
function assignRole(User $user, School $school, Role|string $role = Role::Director, ?Cycle $cycle = null): RoleAssignment
{
    return inSchool($school, static fn (): RoleAssignment => RoleAssignment::factory()->createOne([
        'user_id' => $user->id,
        'role' => $role,
        'cycle_id' => $cycle?->id,
    ]));
}
