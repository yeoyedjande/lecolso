<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 11a : pré-inscriptions envoyées en ligne par les familles depuis la page publique de l'école, puis traitées
 * par le secrétariat (refus motivé, ou inscription pré-remplie). La page publique donne désormais le code de chaque
 * niveau (choix du niveau dans le formulaire) ; `public_school_id` retrouve l'école d'un slug pour les écritures
 * publiques, qui se font ensuite sous la RLS de cette école.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pre_registrations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->string('reference', 20); // PRE-2026-000123
            $table->uuid('level_id');
            $table->string('child_last_name', 80);
            $table->string('child_first_name', 80);
            $table->string('child_gender', 1); // App\Domains\Students\Enums\Gender
            $table->date('child_birth_date');
            $table->string('guardian_name', 120);
            $table->string('guardian_phone', 16); // E.164
            $table->string('guardian_email', 255)->nullable();
            $table->string('message', 500)->nullable(); // jamais journalisé
            $table->string('status', 10); // App\Domains\Students\Enums\PreRegistrationStatus
            $table->uuid('decided_by')->nullable(); // compte, sans clé étrangère (nom recopié)
            $table->string('decided_by_name', 120)->nullable();
            $table->timestampTz('decided_at')->nullable();
            $table->string('decision_note', 200)->nullable();
            $table->uuid('student_id')->nullable();
            $table->string('notification_status', 10)->nullable(); // dernier SMS au parent : queued, sent, failed, skipped
            $table->string('notification_failure', 200)->nullable();
            $table->timestamps();

            $table->foreign(['level_id', 'school_id'])->references(['id', 'school_id'])->on('levels')->cascadeOnDelete();
            $table->unique(['school_id', 'reference']);
            $table->unique(['id', 'school_id']);
            $table->index(['school_id', 'status', 'created_at']);
            $table->index(['school_id', 'guardian_phone']);
        });
        // SET NULL sur la seule colonne : school_id reste renseigné
        DB::statement('ALTER TABLE pre_registrations ADD CONSTRAINT pre_registrations_student_fk FOREIGN KEY (student_id, school_id) REFERENCES students (id, school_id) ON DELETE SET NULL (student_id)');
        DB::statement("ALTER TABLE pre_registrations ADD CONSTRAINT pre_registrations_status CHECK (status IN ('pending', 'refused', 'enrolled'))");
        DB::statement("ALTER TABLE pre_registrations ADD CONSTRAINT pre_registrations_gender CHECK (child_gender IN ('F', 'M'))");
        Rls::enable('pre_registrations');

        // École d'un slug, pour les écritures publiques (pré-inscription) : identifiant seulement, rien d'autre
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION public_school_id(p_slug text)
            RETURNS uuid
            LANGUAGE sql STABLE SECURITY DEFINER
            SET search_path = pg_catalog, public
            AS $$
                SELECT s.id FROM schools s WHERE s.slug = p_slug AND s.deleted_at IS NULL LIMIT 1
            $$
            SQL);
        DB::statement('REVOKE ALL ON FUNCTION public_school_id(text) FROM PUBLIC');
        DB::statement('GRANT EXECUTE ON FUNCTION public_school_id(text) TO app_user');

        // Page publique : niveaux avec leur code (choix du niveau dans le formulaire de pré-inscription)
        DB::statement('DROP FUNCTION IF EXISTS public_school_page(text)');
        DB::statement(self::publicSchoolPage("jsonb_build_object('code', l.code, 'name', l.name)"));
        DB::statement('REVOKE ALL ON FUNCTION public_school_page(text) FROM PUBLIC');
        DB::statement('GRANT EXECUTE ON FUNCTION public_school_page(text) TO app_user');
    }

    public function down(): void
    {
        DB::statement('DROP FUNCTION IF EXISTS public_school_page(text)');
        DB::statement(self::publicSchoolPage('l.name'));
        DB::statement('REVOKE ALL ON FUNCTION public_school_page(text) FROM PUBLIC');
        DB::statement('GRANT EXECUTE ON FUNCTION public_school_page(text) TO app_user');
        DB::statement('DROP FUNCTION IF EXISTS public_school_id(text)');
        Schema::dropIfExists('pre_registrations');
    }

    /** Fonction de la page publique (migration du 09/11), `$level` : contenu de chaque niveau. */
    private static function publicSchoolPage(string $level): string
    {
        return <<<SQL
            CREATE OR REPLACE FUNCTION public_school_page(p_slug text)
            RETURNS TABLE (
                name text, slug text, city text, type text,
                address text, phone text, email text, motto text, logo_path text,
                cycles jsonb
            )
            LANGUAGE sql STABLE SECURITY DEFINER
            SET search_path = pg_catalog, public
            AS \$\$
                SELECT s.name::text, s.slug::text, s.city::text, s.type::text,
                    s.address::text, s.phone::text, s.email::text, s.motto::text, s.logo_path::text,
                    COALESCE((
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'code', c.code,
                                'name', c.name,
                                'levels', COALESCE((
                                    SELECT jsonb_agg({$level} ORDER BY l.position)
                                    FROM levels l WHERE l.cycle_id = c.id
                                ), '[]'::jsonb)
                            ) ORDER BY c.position)
                        FROM cycles c
                        WHERE c.school_id = s.id AND c.is_active
                    ), '[]'::jsonb)
                FROM schools s
                WHERE s.slug = p_slug AND s.deleted_at IS NULL
                LIMIT 1
            \$\$
            SQL;
    }
};
