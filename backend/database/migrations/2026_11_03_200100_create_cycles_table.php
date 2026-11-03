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
        Schema::create('cycles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            // Code du catalogue (config/cycles.php) : identifie le cycle, jamais testé dans le code métier
            $table->string('code');
            $table->string('name');
            $table->unsignedSmallInteger('position')->default(0);
            // Paramètres validés par App\Support\Cycles\CycleSettings
            $table->jsonb('settings');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['school_id', 'code']);
            // Cible des clés étrangères composites (cycle_id, school_id) : un niveau ou une affectation
            // ne peut pas pointer vers le cycle d'une autre école
            $table->unique(['id', 'school_id']);
        });

        Rls::enable('cycles');
    }

    public function down(): void
    {
        Schema::dropIfExists('cycles');
    }
};
