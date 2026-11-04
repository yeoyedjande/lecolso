<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Journal d'audit par école (spatie/laravel-activitylog, modèle App\Support\Audit\Activity).
 * Remplace la table créée à l'étape 1, vide partout : identifiant UUID, school_id obligatoire et RLS.
 * Une action sans école déterminable n'est pas journalisée ici (décision du 03/11/2026).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('activity_log');

        Schema::create('activity_log', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->string('log_name')->nullable();
            $table->text('description');
            $table->nullableUuidMorphs('subject', 'subject');
            $table->string('event')->nullable();
            $table->nullableUuidMorphs('causer', 'causer');
            $table->jsonb('properties')->nullable();
            $table->uuid('batch_uuid')->nullable();
            $table->timestamps();

            $table->index(['school_id', 'created_at']);
            $table->index('log_name');
        });

        Rls::enable('activity_log');
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_log');
    }
};
