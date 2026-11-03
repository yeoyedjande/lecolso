<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levels', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('cycle_id');
            $table->string('code');
            $table->string('name');
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->foreign(['cycle_id', 'school_id'])->references(['id', 'school_id'])->on('cycles')->cascadeOnDelete();
            $table->unique(['school_id', 'cycle_id', 'code']);
            $table->unique(['id', 'school_id']);
        });

        Rls::enable('levels');
    }

    public function down(): void
    {
        Schema::dropIfExists('levels');
    }
};
