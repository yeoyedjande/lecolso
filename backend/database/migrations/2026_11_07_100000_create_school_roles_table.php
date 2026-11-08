<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rôles définis par l'école :
 * - rôle personnalisé : system_key nul, nom obligatoire (« Surveillant général ») ; une affectation le cite par son id ;
 * - ajustement d'un rôle système modifiable (config/roles.php, editable_system_roles) : system_key renseigné,
 *   permissions propres à l'école à la place de celles de config/permissions.php.
 * Les rôles système eux-mêmes ne sont pas des lignes : les affectations existantes restent valides telles quelles.
 *
 * RLS : écriture dans l'école courante ; lecture aussi dans les écoles où l'utilisateur courant a une affectation
 * (calcul des permissions de /me pour toutes ses écoles).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_roles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->string('system_key')->nullable(); // App\Domains\Identity\Enums\Role
            $table->string('name', 60)->nullable();
            $table->string('description', 255)->nullable();
            $table->jsonb('permissions')->default('[]'); // clés de config/permissions.php
            $table->timestamps();

            // Un seul ajustement par rôle système et par école (plusieurs rôles personnalisés : system_key nul)
            $table->unique(['school_id', 'system_key']);
            $table->index('school_id');
        });

        // Deux rôles personnalisés d'une même école ne portent pas le même nom (casse ignorée)
        DB::statement('CREATE UNIQUE INDEX school_roles_school_id_name_unique ON school_roles (school_id, lower(name)) WHERE name IS NOT NULL');
        DB::statement('ALTER TABLE school_roles ADD CONSTRAINT school_roles_custom_or_system CHECK ((system_key IS NULL) <> (name IS NULL))');

        Rls::enable('school_roles');
        Rls::policy(
            'school_roles',
            'member_school_roles_select',
            'SELECT',
            'school_id IN (SELECT school_id FROM role_assignments WHERE user_id = '.Rls::CURRENT_USER.')',
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('school_roles');
    }
};
