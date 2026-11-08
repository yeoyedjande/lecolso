<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Relances des impayés (lot 5c) : un SMS par payeur, pour ses factures en retard. Le texte du SMS n'est jamais
 * stocké (il cite le prénom des enfants) : il est composé au moment de l'envoi. Statut : queued, sent, failed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_reminders', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('payer_id')->nullable();
            $table->jsonb('invoice_ids'); // factures relancées
            $table->string('phone', 20); // E.164, au moment de la relance
            $table->bigInteger('overdue_amount'); // FCFA, retard cumulé des factures relancées
            $table->string('status', 10); // App\Domains\Billing\Enums\ReminderStatus
            $table->string('failure', 120)->nullable();
            $table->timestampTz('sent_at')->nullable();
            $table->uuid('created_by');
            $table->string('created_by_name', 120);
            $table->timestamps();

            $table->index(['school_id', 'payer_id', 'created_at']);
        });
        DB::statement('ALTER TABLE payment_reminders ADD CONSTRAINT payment_reminders_payer FOREIGN KEY (payer_id, school_id) REFERENCES payers (id, school_id) ON DELETE SET NULL (payer_id)');
        DB::statement('ALTER TABLE payment_reminders ADD CONSTRAINT payment_reminders_amount CHECK (overdue_amount > 0)');
        Rls::enable('payment_reminders');
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_reminders');
    }
};
