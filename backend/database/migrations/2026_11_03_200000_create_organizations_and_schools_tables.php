<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Groupes scolaires et établissements (le tenant).
 *
 * RLS sur schools : app_user ne voit que l'école courante (politique ci-dessous) et les écoles où
 * l'utilisateur courant a une affectation (politique ajoutée avec role_assignments). Aucune politique
 * INSERT ni DELETE : créer ou supprimer une école passe par la connexion super-admin (Platform::run).
 * organizations : RLS activée sans politique ici (tout est refusé), visibilité ajoutée avec role_assignments.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->timestamps();
        });

        Rls::enableOnly('organizations');

        Schema::create('schools', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            // Sous-domaine du frontend (<slug>.<domaine>) : unique sur toute la plateforme
            $table->string('slug')->unique();
            $table->string('type'); // App\Domains\Tenancy\Enums\SchoolType
            $table->string('city')->nullable();
            $table->char('currency', 3)->default('XOF');
            $table->string('logo_path')->nullable();
            $table->jsonb('settings')->default('{}');
            // Modules activés pour l'établissement (schools.features)
            $table->jsonb('features')->default('{}');
            $table->timestamps();
            $table->softDeletes();
        });

        Rls::enableOnly('schools');
        Rls::policy('schools', 'current_school_select', 'SELECT', 'id = '.Rls::CURRENT_SCHOOL);
        Rls::policy('schools', 'current_school_update', 'UPDATE', 'id = '.Rls::CURRENT_SCHOOL);
    }

    public function down(): void
    {
        Schema::dropIfExists('schools');
        Schema::dropIfExists('organizations');
    }
};
