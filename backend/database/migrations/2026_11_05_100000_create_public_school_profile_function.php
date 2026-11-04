<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/*
 * Page publique d'une école (<slug>.<domaine>, sans connexion) : fonction SECURITY DEFINER qui ne renvoie que
 * des informations publiques (nom, ville, type, cycles et niveaux), jamais d'identifiant ni de donnée personnelle.
 * C'est la seule lecture de schools et cycles possible hors contexte d'école : la RLS reste fermée pour app_user.
 */
return new class extends Migration
{
    public function up(): void
    {
        // OR REPLACE : migrate:fresh supprime les tables mais pas les fonctions
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
    }

    public function down(): void
    {
        DB::statement('DROP FUNCTION IF EXISTS public_school_profile(text)');
    }
};
