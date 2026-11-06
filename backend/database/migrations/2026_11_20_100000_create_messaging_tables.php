<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Messagerie (lot 9a, décision du 06/11/2026) : un fil par enfant, par tuteur et par destinataire (titulaire de la
 * classe ou administration), messages immuables, lecture par participant ; absences annoncées à l'avance par un
 * parent (rattachées à l'appel des jours couverts, décidées par l'école comme une justification).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planned_absences', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('student_id');
            $table->date('starts_on');
            $table->date('ends_on');
            $table->string('reason', 300); // souvent médical : jamais journalisé
            $table->string('status', 10); // App\Domains\Attendance\Enums\JustificationStatus
            $table->uuid('submitted_by');
            $table->string('submitted_by_name', 120);
            $table->uuid('decided_by')->nullable();
            $table->string('decided_by_name', 120)->nullable();
            $table->timestampTz('decided_at')->nullable();
            $table->string('decision_note', 200)->nullable();
            $table->timestamps();

            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->cascadeOnDelete();
            $table->unique(['id', 'school_id']);
            $table->index(['school_id', 'status']);
            $table->index(['student_id', 'starts_on']);
        });
        DB::statement('ALTER TABLE planned_absences ADD CONSTRAINT planned_absences_dates CHECK (ends_on >= starts_on)');
        DB::statement("ALTER TABLE planned_absences ADD CONSTRAINT planned_absences_status CHECK (status IN ('pending', 'accepted', 'refused'))");
        Rls::enable('planned_absences');

        // Justification créée par l'appel d'un jour couvert par une absence prévue
        Schema::table('absence_justifications', function (Blueprint $table): void {
            $table->uuid('planned_absence_id')->nullable();
            $table->index('planned_absence_id');
        });
        // SET NULL sur la seule colonne : school_id reste renseigné
        DB::statement('ALTER TABLE absence_justifications ADD CONSTRAINT absence_justifications_planned_absence_fk FOREIGN KEY (planned_absence_id, school_id) REFERENCES planned_absences (id, school_id) ON DELETE SET NULL (planned_absence_id)');

        Schema::create('conversations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('student_id');
            $table->uuid('guardian_id');
            $table->string('channel', 10); // App\Domains\Messaging\Enums\ConversationChannel (teacher, office)
            $table->uuid('classroom_id'); // classe de l'enfant à l'ouverture : titulaire et cycle du fil
            $table->uuid('cycle_id');
            $table->string('subject', 120);
            $table->timestampTz('last_message_at');
            $table->timestamps();

            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->cascadeOnDelete();
            $table->foreign(['guardian_id', 'school_id'])->references(['id', 'school_id'])->on('guardians')->cascadeOnDelete();
            $table->foreign(['classroom_id', 'school_id'])->references(['id', 'school_id'])->on('classrooms')->cascadeOnDelete();
            $table->foreign(['cycle_id', 'school_id'])->references(['id', 'school_id'])->on('cycles')->cascadeOnDelete();
            $table->unique(['student_id', 'guardian_id', 'channel']);
            $table->unique(['id', 'school_id']);
            $table->index(['school_id', 'last_message_at']);
            $table->index(['classroom_id', 'channel']);
        });
        DB::statement("ALTER TABLE conversations ADD CONSTRAINT conversations_channel CHECK (channel IN ('teacher', 'office'))");
        Rls::enable('conversations');

        Schema::create('messages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('conversation_id');
            $table->string('side', 10); // guardian, school
            $table->uuid('author_id'); // compte de l'auteur, sans clé étrangère (nom recopié)
            $table->string('author_name', 120);
            $table->text('body'); // jamais journalisé
            $table->uuid('planned_absence_id')->nullable();
            $table->timestampTz('sent_at');
            $table->timestamps();

            $table->foreign(['conversation_id', 'school_id'])->references(['id', 'school_id'])->on('conversations')->cascadeOnDelete();
            $table->index(['conversation_id', 'sent_at']);
        });
        DB::statement('ALTER TABLE messages ADD CONSTRAINT messages_planned_absence_fk FOREIGN KEY (planned_absence_id, school_id) REFERENCES planned_absences (id, school_id) ON DELETE SET NULL (planned_absence_id)');
        DB::statement("ALTER TABLE messages ADD CONSTRAINT messages_side CHECK (side IN ('guardian', 'school'))");
        DB::statement('ALTER TABLE messages ADD CONSTRAINT messages_body CHECK (char_length(body) BETWEEN 1 AND 2000)');
        Rls::enable('messages');

        Schema::create('conversation_reads', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('conversation_id');
            $table->uuid('user_id');
            $table->timestampTz('read_at');
            $table->timestamps();

            $table->foreign(['conversation_id', 'school_id'])->references(['id', 'school_id'])->on('conversations')->cascadeOnDelete();
            $table->unique(['conversation_id', 'user_id']);
            $table->index(['school_id', 'user_id']);
        });
        Rls::enable('conversation_reads');

        // Un message envoyé ne se modifie ni ne s'efface par la connexion applicative (les suppressions en cascade
        // d'une école s'exécutent avec les droits du propriétaire des tables)
        DB::statement(<<<'SQL'
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
                    REVOKE UPDATE, DELETE ON messages FROM app_user;
                END IF;
                IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_platform') THEN
                    REVOKE UPDATE, DELETE ON messages FROM app_platform;
                END IF;
            END
            $$
            SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_reads');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
        Schema::table('absence_justifications', function (Blueprint $table): void {
            $table->dropForeign('absence_justifications_planned_absence_fk');
            $table->dropColumn('planned_absence_id');
        });
        Schema::dropIfExists('planned_absences');
    }
};
