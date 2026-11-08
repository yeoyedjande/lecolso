<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Notes et compétences (lot 7a) : périodes (trimestres, semestres ou période libre, d'après le cycle), matières et
 * coefficients par niveau et par année, évaluations d'une classe (barème propre), notes (absent distingué de non
 * saisi), référentiel de compétences par cycle et par année, et leurs évaluations par période (A, EA, NA).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terms', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('academic_year_id');
            $table->uuid('cycle_id');
            $table->unsignedSmallInteger('position');
            $table->string('label', 60);
            $table->date('starts_on');
            $table->date('ends_on');
            $table->timestamps();

            $table->foreign(['academic_year_id', 'school_id'])->references(['id', 'school_id'])->on('academic_years')->cascadeOnDelete();
            $table->foreign(['cycle_id', 'school_id'])->references(['id', 'school_id'])->on('cycles')->cascadeOnDelete();
            $table->unique(['school_id', 'academic_year_id', 'cycle_id', 'position']);
            $table->unique(['id', 'school_id']);
        });
        DB::statement('ALTER TABLE terms ADD CONSTRAINT terms_dates CHECK (ends_on >= starts_on)');
        Rls::enable('terms');

        Schema::create('subjects', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('academic_year_id');
            $table->uuid('level_id');
            $table->string('name', 80);
            $table->unsignedSmallInteger('coefficient');
            $table->unsignedSmallInteger('position');
            $table->timestamps();

            $table->foreign(['academic_year_id', 'school_id'])->references(['id', 'school_id'])->on('academic_years')->cascadeOnDelete();
            $table->foreign(['level_id', 'school_id'])->references(['id', 'school_id'])->on('levels')->cascadeOnDelete();
            $table->unique(['id', 'school_id']);
            $table->index(['school_id', 'academic_year_id', 'level_id']);
        });
        DB::statement('ALTER TABLE subjects ADD CONSTRAINT subjects_coefficient CHECK (coefficient BETWEEN 1 AND 20)');
        Rls::enable('subjects');

        Schema::create('assessments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('classroom_id');
            $table->uuid('subject_id');
            $table->uuid('term_id');
            $table->string('title', 80);
            $table->date('date');
            $table->unsignedSmallInteger('out_of'); // barème du devoir (sur 10, sur 20…)
            $table->uuid('created_by');
            $table->timestamps();

            $table->foreign(['classroom_id', 'school_id'])->references(['id', 'school_id'])->on('classrooms')->cascadeOnDelete();
            $table->foreign(['subject_id', 'school_id'])->references(['id', 'school_id'])->on('subjects')->restrictOnDelete();
            $table->foreign(['term_id', 'school_id'])->references(['id', 'school_id'])->on('terms')->restrictOnDelete();
            $table->unique(['id', 'school_id']);
            $table->index(['classroom_id', 'term_id', 'subject_id']);
        });
        DB::statement('ALTER TABLE assessments ADD CONSTRAINT assessments_out_of CHECK (out_of BETWEEN 1 AND 100)');
        Rls::enable('assessments');

        Schema::create('grades', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('assessment_id');
            $table->uuid('student_id');
            $table->decimal('value', 5, 2)->nullable(); // note sur le barème du devoir ; null si absent
            $table->boolean('absent')->default(false);
            $table->uuid('entered_by');
            $table->timestamps();

            $table->foreign(['assessment_id', 'school_id'])->references(['id', 'school_id'])->on('assessments')->cascadeOnDelete();
            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->cascadeOnDelete();
            $table->unique(['assessment_id', 'student_id']);
        });
        DB::statement('ALTER TABLE grades ADD CONSTRAINT grades_value CHECK ((absent AND value IS NULL) OR (NOT absent AND value IS NOT NULL AND value >= 0))');
        Rls::enable('grades');

        Schema::create('skills', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('academic_year_id');
            $table->uuid('cycle_id');
            $table->string('domain', 80);
            $table->string('label', 160);
            $table->unsignedSmallInteger('position');
            $table->timestamps();

            $table->foreign(['academic_year_id', 'school_id'])->references(['id', 'school_id'])->on('academic_years')->cascadeOnDelete();
            $table->foreign(['cycle_id', 'school_id'])->references(['id', 'school_id'])->on('cycles')->cascadeOnDelete();
            $table->unique(['id', 'school_id']);
            $table->index(['school_id', 'academic_year_id', 'cycle_id']);
        });
        Rls::enable('skills');

        Schema::create('skill_evaluations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('skill_id');
            $table->uuid('student_id');
            $table->uuid('term_id');
            $table->string('level', 2); // App\Domains\Grading\Enums\SkillLevel : A, EA, NA
            $table->uuid('entered_by');
            $table->timestamps();

            $table->foreign(['skill_id', 'school_id'])->references(['id', 'school_id'])->on('skills')->restrictOnDelete();
            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->cascadeOnDelete();
            $table->foreign(['term_id', 'school_id'])->references(['id', 'school_id'])->on('terms')->restrictOnDelete();
            $table->unique(['skill_id', 'student_id', 'term_id']);
        });
        DB::statement("ALTER TABLE skill_evaluations ADD CONSTRAINT skill_evaluations_level CHECK (level IN ('A', 'EA', 'NA'))");
        Rls::enable('skill_evaluations');
    }

    public function down(): void
    {
        foreach (['skill_evaluations', 'skills', 'grades', 'assessments', 'subjects', 'terms'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
