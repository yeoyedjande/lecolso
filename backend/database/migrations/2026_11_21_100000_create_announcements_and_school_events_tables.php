<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 9b (décision du 06/11/2026) : annonces (toute l'école, un cycle ou une classe ; dans l'appli, le SMS viendra au
 * lot 10) et calendrier de l'école (congés, examens, réunions, événements, formations ; toute l'école ou un cycle).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->string('title', 120);
            $table->text('body');
            $table->string('audience', 10); // App\Domains\Messaging\Enums\AnnouncementAudience (school, cycle, classroom)
            $table->uuid('cycle_id')->nullable(); // cycle visé, ou celui de la classe visée
            $table->uuid('classroom_id')->nullable();
            $table->unsignedInteger('reach'); // élèves concernés à la publication
            $table->uuid('author_id'); // sans clé étrangère : nom recopié
            $table->string('author_name', 120);
            $table->timestampTz('published_at');
            $table->timestamps();

            $table->foreign(['cycle_id', 'school_id'])->references(['id', 'school_id'])->on('cycles')->cascadeOnDelete();
            $table->foreign(['classroom_id', 'school_id'])->references(['id', 'school_id'])->on('classrooms')->cascadeOnDelete();
            $table->index(['school_id', 'published_at']);
        });
        DB::statement("ALTER TABLE announcements ADD CONSTRAINT announcements_audience CHECK ((audience = 'school' AND cycle_id IS NULL AND classroom_id IS NULL) OR (audience = 'cycle' AND cycle_id IS NOT NULL AND classroom_id IS NULL) OR (audience = 'classroom' AND cycle_id IS NOT NULL AND classroom_id IS NOT NULL))");
        DB::statement('ALTER TABLE announcements ADD CONSTRAINT announcements_body CHECK (char_length(body) BETWEEN 1 AND 2000)');
        Rls::enable('announcements');

        Schema::create('school_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->string('title', 120);
            $table->string('kind', 10); // App\Domains\Academic\Enums\SchoolEventKind
            $table->date('starts_on');
            $table->date('ends_on');
            $table->uuid('cycle_id')->nullable(); // null : toute l'école
            $table->string('location', 120)->nullable();
            $table->uuid('created_by');
            $table->timestamps();

            $table->foreign(['cycle_id', 'school_id'])->references(['id', 'school_id'])->on('cycles')->cascadeOnDelete();
            $table->index(['school_id', 'starts_on']);
        });
        DB::statement('ALTER TABLE school_events ADD CONSTRAINT school_events_dates CHECK (ends_on >= starts_on)');
        DB::statement("ALTER TABLE school_events ADD CONSTRAINT school_events_kind CHECK (kind IN ('holiday', 'exam', 'meeting', 'event', 'training'))");
        Rls::enable('school_events');
    }

    public function down(): void
    {
        Schema::dropIfExists('school_events');
        Schema::dropIfExists('announcements');
    }
};
