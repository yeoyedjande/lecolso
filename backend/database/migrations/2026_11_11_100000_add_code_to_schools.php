<?php

declare(strict_types=1);

use App\Domains\Tenancy\Support\SchoolCode;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Préfixe des matricules de l'école (décision du 05/11/2026 : matricule « LAU-000123 », sans année).
 * Écoles existantes : proposé à partir de leur adresse (slug), modifiable par la direction tant qu'aucun matricule
 * n'a été émis. Unicité non exigée : un matricule n'est unique que dans son école.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table): void {
            $table->string('code', 5)->nullable();
        });

        // Migration (rôle propriétaire) : toutes les écoles, y compris supprimées
        foreach (DB::table('schools')->select(['id', 'slug'])->get() as $school) {
            DB::table('schools')->where('id', $school->id)->update(['code' => SchoolCode::suggest(is_string($school->slug) ? $school->slug : '')]);
        }

        DB::statement('ALTER TABLE schools ALTER COLUMN code SET NOT NULL');
        DB::statement("ALTER TABLE schools ADD CONSTRAINT schools_code_format CHECK (code ~ '^[A-Z]{2,5}$')");
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table): void {
            $table->dropColumn('code');
        });
    }
};
