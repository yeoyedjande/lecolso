<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Journal d'audit (spatie/laravel-activitylog). Les trois migrations publiées par le paquet
 * (création, colonne event, colonne batch_uuid) sont regroupées ici.
 * Connexion : celle de la migration (pgsql_owner), pas de connexion dédiée.
 * Le school_id et la RLS sont ajoutés au sprint 0, étape 5.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create(config()->string('activitylog.table_name'), function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('log_name')->nullable();
            $table->text('description');
            // Modèles en UUID (règle 6)
            $table->nullableUuidMorphs('subject', 'subject');
            $table->string('event')->nullable();
            $table->nullableUuidMorphs('causer', 'causer');
            $table->json('properties')->nullable();
            $table->uuid('batch_uuid')->nullable();
            $table->timestamps();
            $table->index('log_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(config()->string('activitylog.table_name'));
    }
};
