<?php

declare(strict_types=1);

use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\PendingCommand;

use function Pest\Laravel\artisan;

// Rôles dédiés au test : les vrais app_user / app_platform de la base de test ne sont pas touchés
const TEST_APP_ROLE = 'test_prov_app';
const TEST_PLATFORM_ROLE = 'test_prov_platform';

function provOwner(): Connection
{
    return DB::connection('pgsql_owner');
}

function dropTestRoles(): void
{
    foreach ([TEST_APP_ROLE, TEST_PLATFORM_ROLE] as $role) {
        if (provOwner()->selectOne('SELECT 1 FROM pg_roles WHERE rolname = ?', [$role]) !== null) {
            provOwner()->statement("DROP OWNED BY {$role}");
            provOwner()->statement("DROP ROLE {$role}");
        }
    }
}

/**
 * Attributs du rôle (vide s'il n'existe pas), par nom de colonne de pg_roles.
 *
 * @return array<string, bool>
 */
function roleAttributes(string $role): array
{
    $row = provOwner()->selectOne(
        'SELECT rolcanlogin, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolinherit FROM pg_roles WHERE rolname = ?',
        [$role],
    );

    $attributes = [];
    foreach (is_object($row) ? get_object_vars($row) : [] as $name => $value) {
        $attributes[(string) $name] = $value === true;
    }

    return $attributes;
}

function provision(): PendingCommand
{
    $command = artisan('db:provision-app-role');
    if (! $command instanceof PendingCommand) {
        throw new RuntimeException('Commande artisan non simulée');
    }

    return $command;
}

function canLogin(string $role, string $password): bool
{
    config()->set('database.connections.prov_probe', [
        ...config()->array('database.connections.pgsql'),
        'username' => $role,
        'password' => $password,
    ]);

    try {
        DB::purge('prov_probe');
        DB::connection('prov_probe')->getPdo();

        return true;
    } catch (Throwable) {
        return false;
    } finally {
        DB::disconnect('prov_probe');
    }
}

beforeEach(function (): void {
    dropTestRoles();
    // Connexion sans droit CREATE ROLE (le vrai app_user), pour le cas d'échec
    config()->set('database.connections.prov_unprivileged', config()->array('database.connections.pgsql'));
    config()->set('database.connections.pgsql.username', TEST_APP_ROLE);
    config()->set('database.connections.pgsql.password', 'app-password-0001');
    config()->set('database.connections.pgsql_platform.username', TEST_PLATFORM_ROLE);
    config()->set('database.connections.pgsql_platform.password', 'platform-password-0001');
});

afterEach(function (): void {
    dropTestRoles();
});

it('crée app_user (RLS) et app_platform (BYPASSRLS), sans appartenance croisée', function (): void {
    provision()->assertSuccessful();

    expect(roleAttributes(TEST_APP_ROLE))->toMatchArray([
        'rolcanlogin' => true, 'rolsuper' => false, 'rolbypassrls' => false, 'rolcreaterole' => false, 'rolcreatedb' => false,
    ]);
    expect(roleAttributes(TEST_PLATFORM_ROLE))->toMatchArray([
        'rolcanlogin' => true, 'rolsuper' => false, 'rolbypassrls' => true, 'rolcreaterole' => false, 'rolinherit' => false,
    ]);

    $member = fn (string $a, string $b): mixed => provOwner()->scalar('SELECT pg_has_role(?, ?, ?)', [$a, $b, 'MEMBER']);
    expect($member(TEST_APP_ROLE, TEST_PLATFORM_ROLE))->toBeFalse()
        ->and($member(TEST_PLATFORM_ROLE, TEST_APP_ROLE))->toBeFalse()
        ->and($member(TEST_APP_ROLE, 'app_owner'))->toBeFalse();

    // Droits sur les tables existantes, aucun droit de création dans le schéma
    $privilege = fn (string $sql, string $role): mixed => provOwner()->scalar($sql, [$role]);
    expect($privilege("SELECT has_table_privilege(?, 'public.schools', 'SELECT,INSERT,UPDATE,DELETE')", TEST_APP_ROLE))->toBeTrue()
        ->and($privilege("SELECT has_table_privilege(?, 'public.schools', 'TRUNCATE')", TEST_APP_ROLE))->toBeFalse()
        ->and($privilege("SELECT has_schema_privilege(?, 'public', 'CREATE')", TEST_APP_ROLE))->toBeFalse()
        ->and($privilege("SELECT has_schema_privilege(?, 'public', 'CREATE')", TEST_PLATFORM_ROLE))->toBeFalse();

    expect(canLogin(TEST_APP_ROLE, 'app-password-0001'))->toBeTrue()
        ->and(canLogin(TEST_PLATFORM_ROLE, 'platform-password-0001'))->toBeTrue();
});

it('est idempotente : met à jour les mots de passe, rétablit les attributs et retire une appartenance ajoutée', function (): void {
    provision()->assertSuccessful();

    // Dérive volontaire : BYPASSRLS donné à app_user, app_user membre d'app_platform
    provOwner()->statement('ALTER ROLE '.TEST_APP_ROLE.' BYPASSRLS');
    provOwner()->statement('GRANT '.TEST_PLATFORM_ROLE.' TO '.TEST_APP_ROLE);
    config()->set('database.connections.pgsql.password', 'new-app-password-0002');

    provision()->assertSuccessful();

    expect(roleAttributes(TEST_APP_ROLE)['rolbypassrls'])->toBeFalse()
        ->and(provOwner()->scalar('SELECT pg_has_role(?, ?, ?)', [TEST_APP_ROLE, TEST_PLATFORM_ROLE, 'MEMBER']))->toBeFalse()
        ->and(canLogin(TEST_APP_ROLE, 'new-app-password-0002'))->toBeTrue()
        ->and(canLogin(TEST_APP_ROLE, 'app-password-0001'))->toBeFalse();
});

it('donne les droits sur les tables créées plus tard par le propriétaire (migrations)', function (): void {
    provision()->assertSuccessful();

    provOwner()->statement('CREATE TABLE prov_future (id int)');
    try {
        expect(provOwner()->scalar("SELECT has_table_privilege(?, 'public.prov_future', 'SELECT,INSERT,UPDATE,DELETE')", [TEST_APP_ROLE]))->toBeTrue();
    } finally {
        provOwner()->statement('DROP TABLE prov_future');
    }
});

it('refuse un mot de passe vide ou trop court, et deux rôles identiques, sans rien créer', function (): void {
    config()->set('database.connections.pgsql.password', '');
    provision()->assertFailed();

    config()->set('database.connections.pgsql.password', 'app-password-0001');
    config()->set('database.connections.pgsql_platform.username', TEST_APP_ROLE);
    provision()->assertFailed();

    expect(provOwner()->selectOne('SELECT 1 FROM pg_roles WHERE rolname = ?', [TEST_APP_ROLE]))->toBeNull();
});

it('échoue proprement sans afficher la requête ni le mot de passe quand le rôle ne peut pas être créé', function (): void {
    // app_user n'a pas le droit CREATE ROLE : l'instruction échoue côté serveur
    $command = artisan('db:provision-app-role', ['--database' => 'prov_unprivileged']);
    if (! $command instanceof PendingCommand) {
        throw new RuntimeException('Commande artisan non simulée');
    }

    $command->expectsOutputToContain('SQLSTATE 42501')
        ->doesntExpectOutputToContain('app-password-0001')
        ->doesntExpectOutputToContain('PASSWORD')
        ->assertFailed();

    expect(provOwner()->selectOne('SELECT 1 FROM pg_roles WHERE rolname = ?', [TEST_APP_ROLE]))->toBeNull();
});

it('n’affiche jamais les mots de passe', function (): void {
    provision()
        ->doesntExpectOutputToContain('app-password-0001')
        ->doesntExpectOutputToContain('platform-password-0001')
        ->assertSuccessful();
});
