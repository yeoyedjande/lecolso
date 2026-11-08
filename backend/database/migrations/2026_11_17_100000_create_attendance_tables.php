<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Présences (lot 6) : appels par classe et par jour, absences et retards (les présents ne sont pas stockés),
 * corrections après la journée (direction, motif), justifications d'absence (parent ou école, validées par l'école),
 * garderie (arrivées, départs, journal de la journée), et opérations hors connexion déjà appliquées (idempotence
 * de POST /sync). Identifiants : UUID, éventuellement générés par l'appareil (hors connexion).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roll_calls', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('classroom_id');
            $table->date('date');
            $table->uuid('taken_by');
            $table->string('taken_by_name', 120);
            $table->timestampTz('taken_at');
            $table->timestamps();

            $table->foreign(['classroom_id', 'school_id'])->references(['id', 'school_id'])->on('classrooms')->cascadeOnDelete();
            $table->unique(['classroom_id', 'date']);
            $table->unique(['id', 'school_id']);
            $table->index(['school_id', 'date']);
        });
        Rls::enable('roll_calls');

        Schema::create('attendance_marks', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('roll_call_id');
            $table->uuid('student_id');
            $table->date('date'); // recopiée de l'appel (listes par jour)
            $table->string('status', 10); // App\Domains\Attendance\Enums\AttendanceStatus (absent, late)
            $table->unsignedSmallInteger('late_minutes')->nullable();
            $table->timestamps();

            $table->foreign(['roll_call_id', 'school_id'])->references(['id', 'school_id'])->on('roll_calls')->cascadeOnDelete();
            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->cascadeOnDelete();
            $table->unique(['roll_call_id', 'student_id']);
            $table->unique(['id', 'school_id']);
            $table->index(['school_id', 'date']);
            $table->index(['student_id', 'date']);
        });
        DB::statement("ALTER TABLE attendance_marks ADD CONSTRAINT attendance_marks_status CHECK (status IN ('absent', 'late'))");
        Rls::enable('attendance_marks');

        Schema::create('attendance_corrections', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('roll_call_id');
            $table->string('reason', 200);
            $table->uuid('corrected_by');
            $table->string('corrected_by_name', 120);
            $table->timestamps();

            $table->foreign(['roll_call_id', 'school_id'])->references(['id', 'school_id'])->on('roll_calls')->cascadeOnDelete();
        });
        Rls::enable('attendance_corrections');

        Schema::create('absence_justifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('attendance_mark_id');
            $table->string('reason', 300);
            $table->string('proof_path')->nullable(); // photo du certificat (stockage privé)
            $table->string('source', 10); // guardian, school
            $table->string('status', 10); // pending, accepted, refused
            $table->uuid('submitted_by');
            $table->string('submitted_by_name', 120);
            $table->uuid('decided_by')->nullable();
            $table->string('decided_by_name', 120)->nullable();
            $table->timestampTz('decided_at')->nullable();
            $table->string('decision_note', 200)->nullable();
            $table->timestamps();

            $table->foreign(['attendance_mark_id', 'school_id'])->references(['id', 'school_id'])->on('attendance_marks')->cascadeOnDelete();
            $table->unique('attendance_mark_id');
            $table->index(['school_id', 'status']);
        });
        Rls::enable('absence_justifications');

        Schema::create('daycare_visits', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('student_id');
            $table->date('date');
            $table->string('arrived_at', 5)->nullable(); // HH:MM, heure d'Abidjan
            $table->string('left_at', 5)->nullable();
            $table->string('dropped_by', 120)->nullable();
            $table->string('picked_up_by', 120)->nullable();
            $table->timestamps();

            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->cascadeOnDelete();
            $table->unique(['student_id', 'date']);
            $table->index(['school_id', 'date']);
        });
        Rls::enable('daycare_visits');

        Schema::create('daycare_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('student_id');
            $table->date('date');
            $table->string('time', 5); // HH:MM
            $table->string('kind', 10); // App\Domains\Attendance\Enums\DaycareLogKind
            $table->string('note', 500);
            $table->uuid('created_by');
            $table->timestamps();

            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->cascadeOnDelete();
            $table->index(['school_id', 'date']);
        });
        Rls::enable('daycare_logs');

        // Opérations hors connexion déjà appliquées : un même envoi rejoué ne s'applique qu'une fois
        Schema::create('sync_operations', function (Blueprint $table): void {
            $table->uuid('id')->primary(); // UUID de l'opération, généré par l'appareil
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('user_id');
            $table->string('type', 40);
            $table->string('status', 10); // applied, rejected
            $table->jsonb('result');
            $table->timestamps();

            $table->index(['school_id', 'created_at']);
        });
        Rls::enable('sync_operations');
    }

    public function down(): void
    {
        foreach (['sync_operations', 'daycare_logs', 'daycare_visits', 'absence_justifications', 'attendance_corrections', 'attendance_marks', 'roll_calls'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
