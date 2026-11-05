<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Photos facultatives des élèves et des tuteurs (décision du 05/11/2026 : sans consentement exigé en V1).
 * Fichier WebP dans le stockage privé, sous un nom aléatoire ; lu par une URL signée de 10 minutes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table): void {
            $table->string('photo_path')->nullable();
        });
        Schema::table('guardians', function (Blueprint $table): void {
            $table->string('photo_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table): void {
            $table->dropColumn('photo_path');
        });
        Schema::table('guardians', function (Blueprint $table): void {
            $table->dropColumn('photo_path');
        });
    }
};
