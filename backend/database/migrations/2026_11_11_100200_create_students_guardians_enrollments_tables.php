<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Élèves, tuteurs et inscriptions (cahier des charges 3.1 et modèle de données).
 *
 * - students : dossier de l'élève ; matricule « LAU-000123 » unique dans l'école, attribué à la première inscription.
 *   Données médicales (blood_type, allergies, medical_notes) : jamais journalisées (Support\Audit\SensitiveAttributes),
 *   renvoyées seulement avec la permission students.medical.view. Suppression logique.
 * - guardians : tuteurs de l'école, un par téléphone (une fratrie partage ses tuteurs).
 * - guardian_student : lien de parenté, contact principal et payeur (un de chaque par élève), autorisé à récupérer.
 * - enrollments : élève × classe × année (une par élève et par année) ; pivot des frais, notes et présences.
 *   La classe appartient à l'année de l'inscription (clé composite) ; une classe qui a des inscriptions ne se supprime pas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->string('matricule', 20);
            $table->string('first_name', 80);
            $table->string('last_name', 80);
            $table->char('gender', 1); // App\Domains\Students\Enums\Gender
            $table->date('birth_date');
            $table->string('birth_place', 80)->nullable();
            $table->string('address', 160)->nullable();
            $table->string('blood_type', 3)->nullable(); // App\Domains\Students\Enums\BloodType
            $table->text('allergies')->nullable();
            $table->text('medical_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['school_id', 'matricule']);
            $table->unique(['id', 'school_id']);
            $table->index(['school_id', 'last_name', 'first_name']);
        });
        DB::statement("ALTER TABLE students ADD CONSTRAINT students_gender CHECK (gender IN ('F', 'M'))");
        Rls::enable('students');

        Schema::create('guardians', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('phone', 20); // E.164
            $table->string('email')->nullable();
            $table->string('profession', 80)->nullable();
            $table->timestamps();

            $table->unique(['school_id', 'phone']);
            $table->unique(['id', 'school_id']);
        });
        Rls::enable('guardians');

        Schema::create('guardian_student', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('guardian_id');
            $table->uuid('student_id');
            $table->string('relation', 10); // App\Domains\Students\Enums\GuardianRelation
            $table->boolean('is_primary_contact')->default(false);
            $table->boolean('is_payer')->default(false);
            $table->boolean('can_pick_up')->default(true);
            $table->timestamps();

            $table->foreign(['guardian_id', 'school_id'])->references(['id', 'school_id'])->on('guardians')->cascadeOnDelete();
            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->cascadeOnDelete();
            $table->unique(['student_id', 'guardian_id']);
            $table->index(['school_id', 'guardian_id']);
        });
        // Un contact principal et un payeur par élève
        DB::statement('CREATE UNIQUE INDEX guardian_student_one_primary ON guardian_student (student_id) WHERE is_primary_contact');
        DB::statement('CREATE UNIQUE INDEX guardian_student_one_payer ON guardian_student (student_id) WHERE is_payer');
        Rls::enable('guardian_student');

        // Cible de la clé composite des inscriptions : la classe appartient à l'année de l'inscription
        Schema::table('classrooms', function (Blueprint $table): void {
            $table->unique(['id', 'academic_year_id', 'school_id']);
        });

        Schema::create('enrollments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('student_id');
            $table->uuid('academic_year_id');
            $table->uuid('classroom_id');
            $table->string('status', 10)->default('active'); // App\Domains\Students\Enums\EnrollmentStatus
            $table->date('enrolled_on');
            $table->date('left_on')->nullable();
            $table->string('leave_reason', 200)->nullable();
            $table->timestamps();

            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->cascadeOnDelete();
            $table->foreign(['classroom_id', 'academic_year_id', 'school_id'])
                ->references(['id', 'academic_year_id', 'school_id'])->on('classrooms')->restrictOnDelete();
            $table->unique(['student_id', 'academic_year_id']);
            $table->index(['school_id', 'academic_year_id', 'status']);
            $table->index(['school_id', 'classroom_id']);
        });
        DB::statement("ALTER TABLE enrollments ADD CONSTRAINT enrollments_left CHECK ((status = 'left') = (left_on IS NOT NULL))");
        Rls::enable('enrollments');
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollments');
        Schema::table('classrooms', function (Blueprint $table): void {
            $table->dropUnique(['id', 'academic_year_id', 'school_id']);
        });
        Schema::dropIfExists('guardian_student');
        Schema::dropIfExists('guardians');
        Schema::dropIfExists('students');
    }
};
