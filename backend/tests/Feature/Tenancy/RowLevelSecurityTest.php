<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Level;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/*
| RLS PostgreSQL, sans le scope Eloquent : requêtes SQL brutes sur la connexion applicative (app_user).
| SQL brut volontaire sur des tables métier : c'est précisément ce que la RLS doit bloquer.
*/

it('ne montre en SQL brut que les lignes de l’école courante', function (): void {
    $schoolA = makeSchool(null);
    $schoolB = makeSchool(null);

    inSchool($schoolA, function () use ($schoolA): void {
        expect(distinctColumn('school_id', 'select school_id from levels'))->toBe([$schoolA->id])
            ->and(DB::scalar('select count(*) from levels'))->toBe(10);
    });

    inSchool($schoolB, function () use ($schoolB): void {
        expect(distinctColumn('school_id', 'select school_id from levels'))->toBe([$schoolB->id]);
    });
});

it('échoue en mode fermé : aucune ligne sans contexte (variable jamais définie)', function (): void {
    makeSchool(null);
    makeSchool(null);

    // Connexion neuve : app.school_id n'a jamais été défini dans cette session
    DB::purge('pgsql');

    expect(DB::scalar("select current_setting('app.school_id', true)"))->toBeNull()
        ->and(DB::scalar('select count(*) from levels'))->toBe(0)
        ->and(DB::scalar('select count(*) from cycles'))->toBe(0)
        ->and(DB::scalar('select count(*) from role_assignments'))->toBe(0)
        ->and(DB::scalar('select count(*) from schools'))->toBe(0);
});

it('échoue en mode fermé : aucune ligne après remise à zéro (variable vide)', function (): void {
    $school = makeSchool(null);

    inSchool($school, static fn () => null);

    expect(DB::scalar("select current_setting('app.school_id', true)"))->toBe('')
        ->and(DB::scalar('select count(*) from levels'))->toBe(0);

    DB::statement('RESET app.school_id');

    expect(DB::scalar('select count(*) from levels'))->toBe(0);
});

it('refuse d’écrire une ligne pour une autre école', function (): void {
    $schoolA = makeSchool(null);
    $schoolB = makeSchool(null);
    $cycleB = inSchool($schoolB, static fn (): mixed => DB::scalar('select id from cycles limit 1'));

    inSchool($schoolA, function () use ($schoolB, $cycleB): void {
        expect(static fn () => DB::insert(
            "insert into levels (id, school_id, cycle_id, code, name, position) values (gen_random_uuid(), ?, ?, 'X', 'X', 0)",
            [$schoolB->id, $cycleB],
        ))->toThrow(QueryException::class, 'row-level security');

        // Une ligne d'une autre école est invisible, donc ni modifiable ni supprimable
        expect(DB::update('update levels set name = ? where school_id = ?', ['Piraté', $schoolB->id]))->toBe(0)
            ->and(DB::delete('delete from levels where school_id = ?', [$schoolB->id]))->toBe(0);

        // Déplacer une ligne vers une autre école est refusé
        expect(static fn () => DB::update('update levels set school_id = ?', [$schoolB->id]))
            ->toThrow(QueryException::class, 'row-level security');
    });

    expect(inSchool($schoolB, static fn (): int => Level::query()->where('name', 'Piraté')->count()))->toBe(0);
});

it('refuse de désactiver la RLS depuis la connexion applicative', function (): void {
    makeSchool(null);

    DB::statement('SET row_security = off');

    expect(static fn () => DB::select('select * from levels'))
        ->toThrow(QueryException::class, 'row-level security');
});

it('connecte l’application avec un rôle qui n’est ni superutilisateur, ni BYPASSRLS, ni propriétaire', function (): void {
    expect(rows('select rolname, rolsuper, rolbypassrls from pg_roles where rolname = current_user'))
        ->toBe([['rolname' => 'app_user', 'rolsuper' => false, 'rolbypassrls' => false]])
        ->and(DB::scalar("select count(*) from pg_tables where schemaname = 'public' and tableowner = current_user"))->toBe(0);
});

it('active la RLS avec une politique sur toutes les tables qui ont une colonne school_id', function (): void {
    // Garde-fou : une future migration qui oublie Rls::enable() fait échouer ce test
    $tables = rows(<<<'SQL'
        select c.table_name,
               t.relrowsecurity as rls,
               (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.table_name) as policies
        from information_schema.columns c
        join pg_class t on t.relname = c.table_name and t.relnamespace = 'public'::regnamespace
        where c.table_schema = 'public' and c.column_name = 'school_id'
        order by c.table_name
        SQL);

    expect(array_column($tables, 'table_name'))->toContain('activity_log', 'cycles', 'levels', 'role_assignments');

    foreach ($tables as $table) {
        expect($table['rls'])->toBeTrue()
            ->and($table['policies'])->toBeGreaterThan(0);
    }
});
