<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Années scolaires et classes (cahier des charges, modèle de données : « classe = niveau + année + titulaire »).
 *
 * - academic_years : libellé (2026-2027), dates, ouverte ou clôturée ; une seule année « en cours » par école.
 * - classrooms : niveau + année + section (« A »), capacité, salle, enseignant titulaire (compte de l'école).
 *   Clés étrangères composites (…, school_id) : une classe ne pointe jamais vers le niveau ou l'année d'une autre école.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academic_years', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->string('label', 20);
            $table->date('starts_on');
            $table->date('ends_on');
            $table->string('status', 10)->default('open'); // App\Domains\Academic\Enums\AcademicYearStatus
            $table->boolean('is_current')->default(false);
            $table->timestamps();

            $table->unique(['school_id', 'label']);
            $table->unique(['id', 'school_id']);
        });

        // Une seule année en cours par école
        DB::statement('CREATE UNIQUE INDEX academic_years_one_current ON academic_years (school_id) WHERE is_current');
        DB::statement('ALTER TABLE academic_years ADD CONSTRAINT academic_years_dates CHECK (ends_on > starts_on)');
        Rls::enable('academic_years');

        Schema::create('classrooms', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('academic_year_id');
            $table->uuid('level_id');
            $table->string('section', 10);
            $table->unsignedSmallInteger('capacity')->nullable();
            $table->string('room', 40)->nullable();
            $table->foreignUuid('homeroom_teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign(['academic_year_id', 'school_id'])->references(['id', 'school_id'])->on('academic_years')->cascadeOnDelete();
            $table->foreign(['level_id', 'school_id'])->references(['id', 'school_id'])->on('levels')->restrictOnDelete();
            $table->unique(['school_id', 'academic_year_id', 'level_id', 'section']);
            // Cible des clés étrangères composites des inscriptions (lot 4b)
            $table->unique(['id', 'school_id']);
            $table->index(['school_id', 'academic_year_id']);
        });

        Rls::enable('classrooms');
    }

    public function down(): void
    {
        Schema::dropIfExists('classrooms');
        Schema::dropIfExists('academic_years');
    }
};
