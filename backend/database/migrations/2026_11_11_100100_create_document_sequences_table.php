<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Compteurs de numérotation par école (matricules des élèves ; plus tard, reçus par année : `receipt:2026`).
 * Incrémentés dans la transaction qui crée le document (App\Support\Sequences\Sequence) : un numéro n'est consommé
 * que si le document est enregistré, et deux inscriptions simultanées n'obtiennent jamais le même numéro.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_sequences', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->string('key', 40);
            $table->unsignedBigInteger('last_value');
            $table->timestamps();

            $table->unique(['school_id', 'key']);
        });

        Rls::enable('document_sequences');
    }

    public function down(): void
    {
        Schema::dropIfExists('document_sequences');
    }
};
