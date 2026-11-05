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
        ->and(DB::connection('pgsql_owner')->scalar('select phone from users where is_super_admin'))->toBe('+2250700000001')
        // Rôle personnalisé de démonstration, une seule fois malgré deux exécutions
        ->and(DB::connection('pgsql_owner')->scalar('select name from school_roles where system_key is null'))->toBe('Surveillant général')
        ->and(ownerCount('school_roles'))->toBe(1)
        // Année 2026-2027 en cours et classes des deux écoles, une seule fois
        ->and(ownerCount('academic_years'))->toBe(2)
        ->and(ownerCount('classrooms'))->toBe(17)
        ->and(DB::connection('pgsql_owner')->scalar('select count(*) from classrooms where homeroom_teacher_id is not null'))->toBe(2)
        ->and(ownerCount('students'))->toBe(48)
        ->and(ownerCount('enrollments'))->toBe(48)
        ->and(DB::connection('pgsql_owner')->scalar("select max(matricule) from students where matricule like 'LAU-%'"))->toBe('LAU-000035')
        ->and(DB::connection('pgsql_owner')->scalar('select sum(last_value)::int from document_sequences'))->toBe(48)
        ->and(DB::connection('pgsql_owner')->scalar("select count(*) from guardian_student gs join guardians g on g.id = gs.guardian_id where g.phone = '+2250700000008'"))->toBe(3)
        // Facturation : une facture par élève, une seule remise, échéances égales aux lignes
        ->and(ownerCount('invoices'))->toBe(48)
        ->and(DB::connection('pgsql_owner')->scalar("select count(*) from invoice_lines where kind = 'discount'"))->toBe(1)
        ->and(DB::connection('pgsql_owner')->scalar('select coalesce(sum(amount), 0)::bigint from installments'))
        ->toBe(DB::connection('pgsql_owner')->scalar('select coalesce(sum(amount), 0)::bigint from invoice_lines'));
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
