<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Lot 10b : reçus PDF (un fichier par paiement, et un second marqué « ANNULÉ » après une annulation ; rendu en file,
 * fichier privé à nom aléatoire) et SMS de confirmation d'un paiement (un par paiement, texte jamais stocké).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipt_files', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('payment_id');
            $table->boolean('cancelled'); // version du reçu : annulé ou non
            $table->string('status', 10); // pending, ready, failed
            $table->string('path')->nullable(); // receipts/{uuid}.pdf
            $table->timestampTz('rendered_at')->nullable();
            $table->timestamps();

            $table->foreign(['payment_id', 'school_id'])->references(['id', 'school_id'])->on('payments')->cascadeOnDelete();
            $table->unique(['payment_id', 'cancelled']);
        });
        DB::statement("ALTER TABLE receipt_files ADD CONSTRAINT receipt_files_status CHECK (status IN ('pending', 'ready', 'failed'))");
        Rls::enable('receipt_files');

        Schema::create('payment_notifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('payment_id');
            $table->string('channel', 10); // sms
            $table->string('status', 10); // queued, sent, failed, skipped
            $table->string('failure', 200)->nullable();
            $table->timestampTz('sent_at')->nullable();
            $table->timestamps();

            $table->foreign(['payment_id', 'school_id'])->references(['id', 'school_id'])->on('payments')->cascadeOnDelete();
            $table->unique(['payment_id', 'channel']);
        });
        DB::statement("ALTER TABLE payment_notifications ADD CONSTRAINT payment_notifications_channel CHECK (channel IN ('sms'))");
        DB::statement("ALTER TABLE payment_notifications ADD CONSTRAINT payment_notifications_status CHECK (status IN ('queued', 'sent', 'failed', 'skipped'))");
        Rls::enable('payment_notifications');
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_notifications');
        Schema::dropIfExists('receipt_files');
    }
};
