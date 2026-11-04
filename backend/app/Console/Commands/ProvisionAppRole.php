<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Database\Connection;
use Illuminate\Database\DatabaseManager;
use InvalidArgumentException;

/**
 * Pré-déploiement (Railway) : crée ou met à jour les rôles PostgreSQL de l'application, avec le rôle propriétaire
 * (connexion pgsql_owner). Idempotente ; même logique que docker/postgres/init/01-roles.sql.
 *
 * - app_user (connexion pgsql) : LOGIN, NOSUPERUSER, NOBYPASSRLS, soumis à la RLS ; mot de passe DB_PASSWORD.
 * - app_platform (connexion pgsql_platform) : rôle de connexion SÉPARÉ, LOGIN BYPASSRLS NOSUPERUSER ;
 *   mot de passe DB_PLATFORM_PASSWORD.
 * Aucun des deux ne peut créer dans le schéma ni endosser un autre rôle (appartenances révoquées).
 *
 * SQL brut justifié : DDL de rôles et de droits, aucune table métier lue ni écrite.
 * Les mots de passe ne sont jamais affichés ni journalisés.
 */
final class ProvisionAppRole extends Command
{
    protected $signature = 'db:provision-app-role {--database=pgsql_owner : Connexion du rôle propriétaire}';

    protected $description = 'Crée ou met à jour les rôles PostgreSQL app_user et app_platform (idempotent)';

    public function handle(DatabaseManager $db): int
    {
        $owner = $db->connection($this->stringOption('database'));

        $app = $this->credentials('pgsql', 'DB_PASSWORD');
        $platform = $this->credentials('pgsql_platform', 'DB_PLATFORM_PASSWORD');
        if ($app === null || $platform === null) {
            return self::FAILURE;
        }
        if ($app['username'] === $platform['username']) {
            $this->error('app_user et app_platform doivent être deux rôles distincts.');

            return self::FAILURE;
        }

        $owner->transaction(function () use ($owner, $app, $platform): void {
            $this->upsertRole($owner, $app['username'], $app['password'], 'NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION');
            $this->upsertRole($owner, $platform['username'], $platform['password'], 'NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION');

            $ownerRole = $this->scalar($owner, 'SELECT current_user');
            $this->revokeMembership($owner, $app['username'], [$platform['username'], $ownerRole]);
            $this->revokeMembership($owner, $platform['username'], [$app['username'], $ownerRole]);

            $roles = $this->quoteIdent($app['username']).', '.$this->quoteIdent($platform['username']);
            $database = $this->quoteIdent($this->scalar($owner, 'SELECT current_database()'));
            $ownerIdent = $this->quoteIdent($ownerRole);

            $owner->statement("GRANT CONNECT ON DATABASE {$database} TO {$roles}");
            $owner->statement("GRANT USAGE ON SCHEMA public TO {$roles}");
            $owner->statement("REVOKE CREATE ON SCHEMA public FROM {$roles}");
            // Tables et séquences existantes, puis futures (créées par le rôle propriétaire lors des migrations)
            $owner->statement("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {$roles}");
            $owner->statement("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {$roles}");
            $owner->statement("ALTER DEFAULT PRIVILEGES FOR ROLE {$ownerIdent} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {$roles}");
            $owner->statement("ALTER DEFAULT PRIVILEGES FOR ROLE {$ownerIdent} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {$roles}");
        });

        $this->info("Rôles {$app['username']} et {$platform['username']} à jour.");

        return self::SUCCESS;
    }

    /**
     * @return array{username: string, password: string}|null
     */
    private function credentials(string $connection, string $passwordVariable): ?array
    {
        $username = config()->string("database.connections.{$connection}.username", '');
        $password = config()->string("database.connections.{$connection}.password", '');

        if (preg_match('/^[a-z_][a-z0-9_]{0,62}$/', $username) !== 1) {
            $this->error("Nom de rôle invalide pour la connexion {$connection}.");

            return null;
        }
        if (mb_strlen($password) < 12) {
            $this->error("{$passwordVariable} est vide ou trop court (12 caractères minimum).");

            return null;
        }

        return ['username' => $username, 'password' => $password];
    }

    private function upsertRole(Connection $owner, string $role, string $password, string $attributes): void
    {
        $exists = $owner->selectOne('SELECT 1 AS found FROM pg_roles WHERE rolname = ?', [$role]) !== null;
        $verb = $exists ? 'ALTER ROLE' : 'CREATE ROLE';

        // DDL : pas de paramètre lié possible, le mot de passe est échappé par le pilote (jamais affiché)
        $owner->statement("{$verb} {$this->quoteIdent($role)} WITH LOGIN {$attributes} PASSWORD {$owner->getPdo()->quote($password)}");
    }

    /**
     * @param  list<string>  $forbidden  rôles que $role ne doit pas pouvoir endosser
     */
    private function revokeMembership(Connection $owner, string $role, array $forbidden): void
    {
        foreach ($forbidden as $other) {
            $member = $owner->selectOne(
                'SELECT 1 AS found FROM pg_auth_members m JOIN pg_roles g ON g.oid = m.roleid JOIN pg_roles u ON u.oid = m.member WHERE u.rolname = ? AND g.rolname = ?',
                [$role, $other],
            );
            if ($member !== null) {
                $owner->statement("REVOKE {$this->quoteIdent($other)} FROM {$this->quoteIdent($role)}");
            }
        }
    }

    private function scalar(Connection $owner, string $sql): string
    {
        $value = $owner->scalar($sql);
        if (! is_string($value)) {
            throw new InvalidArgumentException("Réponse inattendue : {$sql}");
        }

        return $value;
    }

    private function quoteIdent(string $identifier): string
    {
        return '"'.str_replace('"', '""', $identifier).'"';
    }

    private function stringOption(string $name): string
    {
        $value = $this->option($name);

        return is_string($value) ? $value : '';
    }
}
