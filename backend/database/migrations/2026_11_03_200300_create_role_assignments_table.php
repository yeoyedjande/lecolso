<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Affectations : un rôle d'un utilisateur dans une école, éventuellement limité à un cycle (cycle_id nul = toute l'école).
 *
 * RLS :
 * - lecture : affectations de l'école courante, ou de l'utilisateur courant dans toutes ses écoles (/me) ;
 * - écriture : école courante uniquement.
 * Ajoute aussi la visibilité « écoles où l'utilisateur a une affectation » sur schools et organizations.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_assignments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('role'); // App\Domains\Identity\Enums\Role
            $table->uuid('cycle_id')->nullable();
            $table->timestamps();

            $table->foreign(['cycle_id', 'school_id'])->references(['id', 'school_id'])->on('cycles')->cascadeOnDelete();
            // Un même rôle n'est attribué qu'une fois par école et par cycle (NULL = toute l'école compte comme une valeur)
            $table->unique(['school_id', 'user_id', 'role', 'cycle_id'])->nullsNotDistinct();
            $table->index(['user_id', 'school_id']);
        });

        Rls::enable('role_assignments');
        Rls::policy('role_assignments', 'own_assignments_select', 'SELECT', 'user_id = '.Rls::CURRENT_USER);

        Rls::policy(
            'schools',
            'member_schools_select',
            'SELECT',
            'id IN (SELECT school_id FROM role_assignments WHERE user_id = '.Rls::CURRENT_USER.')',
        );

        // Un groupe scolaire est visible si l'une de ses écoles l'est (la sous-requête est elle-même soumise à la RLS)
        Rls::policy(
            'organizations',
            'visible_schools_select',
            'SELECT',
            'id IN (SELECT organization_id FROM schools WHERE organization_id IS NOT NULL)',
        );
    }

    public function down(): void
    {
        DB::statement('DROP POLICY IF EXISTS visible_schools_select ON organizations');
        DB::statement('DROP POLICY IF EXISTS member_schools_select ON schools');
        Schema::dropIfExists('role_assignments');
    }
};
