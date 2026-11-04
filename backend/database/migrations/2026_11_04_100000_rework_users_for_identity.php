<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Utilisateurs : connexion par téléphone (E.164) ou e-mail + mot de passe.
 * Une base locale qui contient déjà des utilisateurs sans téléphone doit être repartie de zéro (make fresh).
 *
 * RLS sur users (téléphones et e-mails de tous les parents de toutes les écoles) :
 * - lecture : l'utilisateur lui-même, ou un utilisateur affecté à une école visible (role_assignments,
 *   elle-même limitée à l'école courante et aux affectations de l'utilisateur courant) ;
 * - mise à jour : l'utilisateur lui-même, ou un utilisateur affecté à l'école courante (réinitialisation
 *   par le personnel, contrôlée en plus par UserPolicy) ;
 * - création : permise (un compte vide ne révèle rien) ; suppression : aucune.
 * - connexion : fonction SECURITY DEFINER auth_user_id(login), la seule recherche possible hors contexte ;
 *   elle ne renvoie qu'un identifiant.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('phone', 16)->unique()->after('name');
            $table->string('email')->nullable()->change();
            $table->boolean('must_change_password')->default(false)->after('password');
            $table->timestamp('last_login_at')->nullable()->after('is_super_admin');
        });

        DB::statement('CREATE INDEX users_email_lower_index ON users (lower(email))');

        Rls::enableOnly('users');
        Rls::policy(
            'users',
            'visible_users_select',
            'SELECT',
            'id = '.Rls::CURRENT_USER.' OR id IN (SELECT user_id FROM role_assignments)',
        );
        Rls::policy(
            'users',
            'manageable_users_update',
            'UPDATE',
            'id = '.Rls::CURRENT_USER.' OR id IN (SELECT user_id FROM role_assignments WHERE school_id = '.Rls::CURRENT_SCHOOL.')',
        );
        Rls::policy('users', 'users_insert', 'INSERT', 'true', 'true');

        // Exécutée avec les droits du propriétaire (hors RLS) ; ne renvoie qu'un identifiant.
        // OR REPLACE : migrate:fresh supprime les tables mais pas les fonctions
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION auth_user_id(p_login text) RETURNS uuid
            LANGUAGE sql STABLE SECURITY DEFINER
            SET search_path = pg_catalog, public
            AS $$
                SELECT id FROM users
                WHERE phone = p_login OR lower(email) = lower(p_login)
                LIMIT 1
            $$
            SQL);
        DB::statement('REVOKE ALL ON FUNCTION auth_user_id(text) FROM PUBLIC');
        DB::statement('GRANT EXECUTE ON FUNCTION auth_user_id(text) TO app_user');
    }

    public function down(): void
    {
        DB::statement('DROP FUNCTION IF EXISTS auth_user_id(text)');
        Rls::disable('users', 'visible_users_select', 'manageable_users_update', 'users_insert');
        DB::statement('DROP INDEX IF EXISTS users_email_lower_index');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['phone', 'must_change_password', 'last_login_at']);
        });
    }
};
