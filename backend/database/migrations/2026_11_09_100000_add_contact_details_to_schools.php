<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Identité de l'école, saisie par la direction (Paramètres) : adresse, téléphone (E.164), e-mail et devise.
 * Ce sont les coordonnées de l'établissement, affichées sur sa page publique avec son logo (schools.logo_path).
 *
 * La page publique passe par une nouvelle fonction public_school_page, qui renvoie aussi ces coordonnées et le chemin
 * du logo (l'API en tire une URL signée) ; toujours aucun identifiant ni donnée personnelle. Nouveau nom plutôt
 * qu'un changement du type de retour de public_school_profile : migrate:fresh garde les fonctions, et la migration
 * d'origine (déjà fusionnée, non modifiable) ne pourrait plus recréer l'ancienne. public_school_profile est supprimée.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table): void {
            $table->string('address', 255)->nullable()->after('city');
            $table->string('phone', 16)->nullable()->after('address');
            $table->string('email', 255)->nullable()->after('phone');
            $table->string('motto', 120)->nullable()->after('email');
        });

        DB::statement('DROP FUNCTION IF EXISTS public_school_profile(text)');
        // OR REPLACE : migrate:fresh supprime les tables mais pas les fonctions
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION public_school_page(p_slug text)
            RETURNS TABLE (
                name text, slug text, city text, type text,
                address text, phone text, email text, motto text, logo_path text,
                cycles jsonb
            )
            LANGUAGE sql STABLE SECURITY DEFINER
            SET search_path = pg_catalog, public
            AS $$
                SELECT s.name::text, s.slug::text, s.city::text, s.type::text,
                    s.address::text, s.phone::text, s.email::text, s.motto::text, s.logo_path::text,
                    COALESCE((
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'code', c.code,
                                'name', c.name,
                                'levels', COALESCE((
                                    SELECT jsonb_agg(l.name ORDER BY l.position)
                                    FROM levels l WHERE l.cycle_id = c.id
                                ), '[]'::jsonb)
                            ) ORDER BY c.position)
                        FROM cycles c
                        WHERE c.school_id = s.id AND c.is_active
                    ), '[]'::jsonb)
                FROM schools s
                WHERE s.slug = p_slug AND s.deleted_at IS NULL
                LIMIT 1
            $$
            SQL);
        DB::statement('REVOKE ALL ON FUNCTION public_school_page(text) FROM PUBLIC');
        DB::statement('GRANT EXECUTE ON FUNCTION public_school_page(text) TO app_user');
    }

    public function down(): void
    {
        // Fonction précédente (sans coordonnées ni logo), avant de retirer les colonnes que la nouvelle lit
        DB::statement('DROP FUNCTION IF EXISTS public_school_page(text)');
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION public_school_profile(p_slug text)
            RETURNS TABLE (name text, slug text, city text, type text, cycles jsonb)
            LANGUAGE sql STABLE SECURITY DEFINER
            SET search_path = pg_catalog, public
            AS $$
                SELECT s.name::text, s.slug::text, s.city::text, s.type::text,
                    COALESCE((
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'code', c.code,
                                'name', c.name,
                                'levels', COALESCE((
                                    SELECT jsonb_agg(l.name ORDER BY l.position)
                                    FROM levels l WHERE l.cycle_id = c.id
                                ), '[]'::jsonb)
                            ) ORDER BY c.position)
                        FROM cycles c
                        WHERE c.school_id = s.id AND c.is_active
                    ), '[]'::jsonb)
                FROM schools s
                WHERE s.slug = p_slug AND s.deleted_at IS NULL
                LIMIT 1
            $$
            SQL);
        DB::statement('REVOKE ALL ON FUNCTION public_school_profile(text) FROM PUBLIC');
        DB::statement('GRANT EXECUTE ON FUNCTION public_school_profile(text) TO app_user');

        Schema::table('schools', function (Blueprint $table): void {
            $table->dropColumn(['address', 'phone', 'email', 'motto']);
        });
    }
};
