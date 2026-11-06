<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Bulletins (lot 7b) : appréciations (générale du titulaire, observation et mention de la direction ; par matière),
 * seuils des mentions par cycle, validation d'une classe pour une période (notes figées ; déverrouillage motivé, gardé
 * dans l'historique) et bulletins PDF rendus à la validation. Auteurs recopiés (id et nom), sans clé étrangère vers users.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appreciations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('term_id');
            $table->uuid('student_id');
            $table->string('teacher_comment', 500)->nullable();
            $table->string('director_comment', 500)->nullable();
            $table->string('mention', 20)->nullable(); // App\Domains\Grading\Enums\Mention, choisie par la direction
            $table->boolean('mention_chosen')->default(false); // false : mention proposée d'après la moyenne
            $table->uuid('updated_by');
            $table->timestamps();

            $table->foreign(['term_id', 'school_id'])->references(['id', 'school_id'])->on('terms')->cascadeOnDelete();
            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->cascadeOnDelete();
            $table->unique(['term_id', 'student_id']);
        });
        DB::statement("ALTER TABLE appreciations ADD CONSTRAINT appreciations_mention CHECK (mention IS NULL OR mention IN ('congratulations', 'honor_roll', 'encouragement', 'warning'))");
        Rls::enable('appreciations');

        Schema::create('subject_appreciations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('term_id');
            $table->uuid('student_id');
            $table->uuid('subject_id');
            $table->string('comment', 200);
            $table->uuid('updated_by');
            $table->timestamps();

            $table->foreign(['term_id', 'school_id'])->references(['id', 'school_id'])->on('terms')->cascadeOnDelete();
            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->cascadeOnDelete();
            $table->foreign(['subject_id', 'school_id'])->references(['id', 'school_id'])->on('subjects')->cascadeOnDelete();
            $table->unique(['term_id', 'student_id', 'subject_id']);
        });
        Rls::enable('subject_appreciations');

        // Seuils des mentions d'un cycle, sur l'échelle du cycle (sans ligne : valeurs de config/grading.php)
        Schema::create('mention_thresholds', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('cycle_id');
            $table->decimal('congratulations', 5, 2);
            $table->decimal('honor_roll', 5, 2);
            $table->decimal('encouragement', 5, 2);
            $table->decimal('warning_below', 5, 2);
            $table->timestamps();

            $table->foreign(['cycle_id', 'school_id'])->references(['id', 'school_id'])->on('cycles')->cascadeOnDelete();
            $table->unique('cycle_id');
        });
        DB::statement('ALTER TABLE mention_thresholds ADD CONSTRAINT mention_thresholds_order CHECK (warning_below >= 0 AND warning_below <= encouragement AND encouragement <= honor_roll AND honor_roll <= congratulations)');
        Rls::enable('mention_thresholds');

        // Validation d'une classe pour une période : une seule en cours (non rouverte) à la fois
        Schema::create('term_closures', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('classroom_id');
            $table->uuid('term_id');
            $table->timestampTz('closed_at');
            $table->uuid('closed_by');
            $table->string('closed_by_name', 120);
            $table->timestampTz('reopened_at')->nullable();
            $table->uuid('reopened_by')->nullable();
            $table->string('reopened_by_name', 120)->nullable();
            $table->string('reopen_reason', 200)->nullable();
            $table->timestamps();

            $table->foreign(['classroom_id', 'school_id'])->references(['id', 'school_id'])->on('classrooms')->cascadeOnDelete();
            $table->foreign(['term_id', 'school_id'])->references(['id', 'school_id'])->on('terms')->cascadeOnDelete();
            $table->unique(['id', 'school_id']);
            $table->index(['classroom_id', 'term_id']);
        });
        DB::statement('CREATE UNIQUE INDEX term_closures_one_open ON term_closures (classroom_id, term_id) WHERE reopened_at IS NULL');
        DB::statement('ALTER TABLE term_closures ADD CONSTRAINT term_closures_reopen CHECK ((reopened_at IS NULL AND reopen_reason IS NULL) OR (reopened_at IS NOT NULL AND reopen_reason IS NOT NULL))');
        Rls::enable('term_closures');

        // Bulletin PDF d'un élève, rendu à la validation (stockage privé, nom aléatoire, URL signée de 10 minutes)
        Schema::create('report_cards', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('term_closure_id');
            $table->uuid('student_id');
            $table->string('status', 10); // pending, ready, failed
            $table->string('path', 120)->nullable();
            $table->jsonb('data')->nullable(); // données du bulletin figées à la validation (le PDF est rendu depuis elles)
            $table->timestampTz('rendered_at')->nullable();
            $table->timestamps();

            $table->foreign(['term_closure_id', 'school_id'])->references(['id', 'school_id'])->on('term_closures')->cascadeOnDelete();
            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->cascadeOnDelete();
            $table->unique(['term_closure_id', 'student_id']);
        });
        DB::statement("ALTER TABLE report_cards ADD CONSTRAINT report_cards_status CHECK (status IN ('pending', 'ready', 'failed'))");
        Rls::enable('report_cards');
    }

    public function down(): void
    {
        foreach (['report_cards', 'term_closures', 'mention_thresholds', 'subject_appreciations', 'appreciations'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
