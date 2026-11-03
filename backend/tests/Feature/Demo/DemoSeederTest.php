<?php

declare(strict_types=1);

use App\Domains\Tenancy\Models\School;
use Database\Seeders\DemoSeeder;
use Illuminate\Support\Facades\DB;

/** Exécute le seeder de démo comme db:seed (sans la confirmation interactive de la production). */
function runDemoSeeder(): void
{
    (new DemoSeeder)->setContainer(app())->__invoke();
}

/**
 * Comptage par le rôle propriétaire (hors RLS).
 */
function ownerCount(string $table): int
{
    $count = DB::connection('pgsql_owner')->scalar("select count(*) from {$table}");

    return is_int($count) ? $count : -1;
}

it('refuse explicitement de s’exécuter en production, avant toute écriture', function (): void {
    app()->detectEnvironment(static fn (): string => 'production');

    expect(static fn () => runDemoSeeder())
        ->toThrow(RuntimeException::class, 'production');

    expect(ownerCount('schools'))->toBe(0)
        ->and(ownerCount('users'))->toBe(0);
});

it('s’exécute en staging', function (): void {
    app()->detectEnvironment(static fn (): string => 'staging');

    runDemoSeeder();

    expect(ownerCount('schools'))->toBe(2);
});

it('crée les deux écoles, leurs cycles, un compte par rôle et leurs affectations, sans doublon', function (): void {
    runDemoSeeder();
    runDemoSeeder();

    $schools = DB::connection('pgsql_owner')->select(
        'select s.slug, string_agg(c.code, \',\' order by c.position) as cycles
         from schools s join cycles c on c.school_id = s.id group by s.slug order by s.slug',
    );

    expect(array_map(static fn (mixed $row): array => (array) $row, $schools))->toBe([
        ['slug' => 'les-lauriers', 'cycles' => 'daycare,kindergarten,primary'],
        ['slug' => 'petits-genies', 'cycles' => 'daycare,kindergarten'],
    ])
        ->and(ownerCount('users'))->toBe(count(DemoSeeder::ACCOUNTS))
        ->and(ownerCount('role_assignments'))->toBe(array_sum(array_map(static fn (array $account): int => count($account['roles']), DemoSeeder::ACCOUNTS)))
        ->and(DB::connection('pgsql_owner')->scalar('select count(*) from users where must_change_password'))->toBe(0)
        ->and(DB::connection('pgsql_owner')->scalar('select phone from users where is_super_admin'))->toBe('+2250700000001');
});

it('permet à la directrice de la maternelle de se connecter et de ne voir que la maternelle', function (): void {
    runDemoSeeder();

    spa('POST', '/api/v1/auth/login', ['login' => '07 00 00 00 04', 'password' => DemoSeeder::PASSWORD])
        ->assertOk()
        ->assertJsonPath('data.must_change_password', false)
        ->assertJsonPath('data.schools.0.name', 'Les Lauriers');

    $schoolId = spa('GET', '/api/v1/me')->json('data.schools.0.id');
    expect($schoolId)->toBeString();
    \assert(is_string($schoolId));

    $school = new School;
    $school->forceFill(['id' => $schoolId]);

    spa('GET', '/api/v1/cycles', [], $school)
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.code', 'kindergarten');
});
