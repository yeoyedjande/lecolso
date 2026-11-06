<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Paiement Mobile Money par les parents (lot 10a, décision du 06/11/2026) : demandes de paiement envoyées au prestataire
 * (montant crédité sur la facture, frais, montant débité), notifications reçues (idempotence par référence) ; un
 * paiement en ligne n'appartient à aucune caisse. Le webhook, hors établissement, retrouve l'école d'une demande par une
 * fonction SECURITY DEFINER qui ne renvoie qu'un identifiant.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_intents', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('invoice_id');
            $table->uuid('student_id');
            $table->uuid('requested_by'); // compte du parent (sans clé étrangère : nom recopié)
            $table->string('requested_by_name', 120);
            $table->string('method', 20); // App\Domains\Billing\Enums\PaymentMethod (Mobile Money seulement)
            $table->string('phone', 20); // E.164, jamais journalisé en clair
            $table->bigInteger('amount'); // FCFA crédités sur la facture
            $table->bigInteger('fee'); // FCFA de frais du prestataire
            $table->bigInteger('charged'); // FCFA débités au parent (montant + frais s'il les paie)
            $table->string('fee_payer', 10); // school, guardian
            $table->string('provider', 30);
            $table->string('provider_reference', 80)->nullable();
            $table->string('status', 10); // App\Domains\Billing\Enums\PaymentIntentStatus
            $table->string('failure_reason', 200)->nullable();
            $table->uuid('payment_id')->nullable();
            $table->timestampTz('expires_at');
            $table->timestamps();

            $table->foreign(['invoice_id', 'school_id'])->references(['id', 'school_id'])->on('invoices')->restrictOnDelete();
            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->restrictOnDelete();
            $table->foreign(['payment_id', 'school_id'])->references(['id', 'school_id'])->on('payments')->restrictOnDelete();
            $table->unique(['provider', 'provider_reference']);
            $table->unique(['id', 'school_id']);
            $table->index(['invoice_id', 'status']);
        });
        DB::statement('ALTER TABLE payment_intents ADD CONSTRAINT payment_intents_amounts CHECK (amount > 0 AND fee >= 0 AND charged >= amount)');
        DB::statement("ALTER TABLE payment_intents ADD CONSTRAINT payment_intents_status CHECK (status IN ('pending', 'succeeded', 'failed', 'expired'))");
        Rls::enable('payment_intents');

        Schema::create('payment_webhook_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('payment_intent_id');
            $table->string('provider', 30);
            $table->string('event_key', 120); // référence de l'opérateur et statut : une notification n'est traitée qu'une fois
            $table->string('status', 10);
            $table->timestamps();

            $table->foreign(['payment_intent_id', 'school_id'])->references(['id', 'school_id'])->on('payment_intents')->cascadeOnDelete();
            $table->unique(['provider', 'event_key']);
        });
        Rls::enable('payment_webhook_events');

        // Paiement en ligne : aucune caisse (le guichet garde sa session obligatoire par l'Action RecordPayment)
        DB::statement('ALTER TABLE payments ALTER COLUMN cash_session_id DROP NOT NULL');

        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION payment_intent_school(p_provider text, p_reference text) RETURNS uuid
            LANGUAGE sql STABLE SECURITY DEFINER
            SET search_path = pg_catalog, public
            AS $$
                SELECT school_id FROM payment_intents
                WHERE provider = p_provider AND provider_reference = p_reference
                LIMIT 1
            $$
            SQL);
        DB::statement('REVOKE ALL ON FUNCTION payment_intent_school(text, text) FROM PUBLIC');
        DB::statement(<<<'SQL'
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
                    GRANT EXECUTE ON FUNCTION payment_intent_school(text, text) TO app_user;
                END IF;
            END
            $$
            SQL);
    }

    public function down(): void
    {
        DB::statement('DROP FUNCTION IF EXISTS payment_intent_school(text, text)');
        Schema::dropIfExists('payment_webhook_events');
        Schema::dropIfExists('payment_intents');
        DB::statement('ALTER TABLE payments ALTER COLUMN cash_session_id SET NOT NULL');
    }
};
