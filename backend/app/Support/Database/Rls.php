<?php

declare(strict_types=1);

namespace App\Support\Database;

use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Row-Level Security PostgreSQL : politiques d'isolation entre établissements.
 *
 * Mode fermé : sans contexte (variable jamais définie, ou remise à zéro et donc vide),
 * NULLIF(..., '') donne NULL, la comparaison est fausse et aucune ligne n'est visible ni écrivable.
 * Le contexte est posé par App\Support\Tenancy\TenantContext.
 */
final class Rls
{
    /** École courante (uuid) ou NULL : jamais d'erreur de conversion sur une valeur vide. */
    public const string CURRENT_SCHOOL = "NULLIF(current_setting('app.school_id', true), '')::uuid";

    /** Utilisateur authentifié courant (uuid) ou NULL. */
    public const string CURRENT_USER = "NULLIF(current_setting('app.user_id', true), '')::uuid";

    /**
     * Active la RLS sur une table métier : lecture et écriture limitées à l'école courante.
     * À appeler dans la migration qui crée la table.
     */
    public static function enable(string $table, string $column = 'school_id'): void
    {
        self::enableOnly($table);
        self::policy($table, 'tenant_isolation', 'ALL', self::matchesCurrentSchool($column));
    }

    /**
     * Active la RLS sans politique : tout est refusé à app_user tant qu'aucune politique n'est ajoutée.
     */
    public static function enableOnly(string $table): void
    {
        DB::statement(sprintf('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', self::identifier($table)));
    }

    /**
     * Ajoute une politique. $command : ALL, SELECT, INSERT, UPDATE ou DELETE.
     * Pour ALL et UPDATE, $check vaut $using par défaut (on ne peut pas écrire une ligne qu'on ne pourrait pas lire).
     */
    public static function policy(
        string $table,
        string $name,
        string $command,
        string $using,
        ?string $check = null,
    ): void {
        $command = strtoupper($command);

        if (! in_array($command, ['ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'], true)) {
            throw new InvalidArgumentException("Commande de politique RLS inconnue : {$command}");
        }

        $sql = sprintf('CREATE POLICY %s ON %s FOR %s', self::identifier($name), self::identifier($table), $command);

        if ($command !== 'INSERT') {
            $sql .= " USING ({$using})";
        }

        if (in_array($command, ['ALL', 'UPDATE', 'INSERT'], true)) {
            $sql .= ' WITH CHECK ('.($check ?? $using).')';
        }

        DB::statement($sql);
    }

    /** Supprime la RLS et toutes les politiques citées (méthode down() des migrations). */
    public static function disable(string $table, string ...$policies): void
    {
        foreach ($policies === [] ? ['tenant_isolation'] : $policies as $policy) {
            DB::statement(sprintf('DROP POLICY IF EXISTS %s ON %s', self::identifier($policy), self::identifier($table)));
        }

        DB::statement(sprintf('ALTER TABLE %s DISABLE ROW LEVEL SECURITY', self::identifier($table)));
    }

    public static function matchesCurrentSchool(string $column = 'school_id'): string
    {
        return self::identifier($column).' = '.self::CURRENT_SCHOOL;
    }

    /** Les noms viennent du code des migrations ; ils sont tout de même validés avant d'entrer dans du SQL. */
    private static function identifier(string $name): string
    {
        if (preg_match('/^[a-z_][a-z0-9_]*$/', $name) !== 1) {
            throw new InvalidArgumentException("Identifiant SQL invalide : {$name}");
        }

        return $name;
    }
}
