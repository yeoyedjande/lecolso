<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Tenancy\Models\School;
use App\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
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
    // is_super_admin n'est pas assignable en masse : écriture explicite
    $user->forceFill(['is_super_admin' => true])->save();

    return $user;
}

/** Affecte un rôle à un utilisateur dans une école (toute l'école, ou un cycle). */
function assignRole(User $user, School $school, Role $role = Role::Director, ?Cycle $cycle = null): RoleAssignment
{
    return inSchool($school, static fn (): RoleAssignment => RoleAssignment::factory()->createOne([
        'user_id' => $user->id,
        'role' => $role,
        'cycle_id' => $cycle?->id,
    ]));
}
