<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Gestion des comptes par l'école (décision du 04/11/2026, docs/decisions-metier.md) :
 *
 * - member_deactivations : un compte désactivé DANS UNE ÉCOLE (accès coupé, réversible) ; ses affectations sont
 *   conservées et retrouvées à la réactivation. RLS : école courante ; lecture aussi de ses propres lignes
 *   (calcul de /me dans toutes ses écoles).
 * - forget_user(id) : SECURITY DEFINER, appelée après le retrait de toutes les affectations d'un compte dans
 *   l'école courante. Elle n'efface le compte que s'il n'a plus aucune affectation, dans AUCUNE école, et n'est
 *   pas super-admin ; sinon elle ne fait rien. app_user ne peut ni voir les autres écoles ni supprimer un compte :
 *   c'est le seul chemin, et il ne permet de supprimer que des comptes orphelins.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_deactivations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('deactivated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['school_id', 'user_id']);
            $table->index('user_id');
        });

        Rls::enable('member_deactivations');
        Rls::policy('member_deactivations', 'own_deactivations_select', 'SELECT', 'user_id = '.Rls::CURRENT_USER);

        // OR REPLACE : migrate:fresh supprime les tables mais pas les fonctions
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION forget_user(p_user uuid) RETURNS boolean
            LANGUAGE plpgsql VOLATILE SECURITY DEFINER
            SET search_path = pg_catalog, public
            AS $$
            BEGIN
                DELETE FROM users u
                WHERE u.id = p_user
                  AND NOT u.is_super_admin
                  AND NOT EXISTS (SELECT 1 FROM role_assignments ra WHERE ra.user_id = p_user);
                RETURN FOUND;
            END
            $$
            SQL);
        DB::statement('REVOKE ALL ON FUNCTION forget_user(uuid) FROM PUBLIC');
        DB::statement('GRANT EXECUTE ON FUNCTION forget_user(uuid) TO app_user');
    }

    public function down(): void
    {
        DB::statement('DROP FUNCTION IF EXISTS forget_user(uuid)');
        Schema::dropIfExists('member_deactivations');
    }
};
