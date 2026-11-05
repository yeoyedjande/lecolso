<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Encaissements (lot 5b) : sessions de caisse, paiements, annulations, remboursements, reports de crédit, et ligne
 * « départ » des factures. Montants en entiers (FCFA).
 *
 * - Un mouvement d'argent n'est jamais modifié ni effacé : paiements, annulations, remboursements et reports n'acceptent
 *   aucun UPDATE (déclencheur), et la connexion applicative n'a pas le droit DELETE ni UPDATE sur ces tables. Une erreur
 *   se corrige par une annulation (ligne à part, motif obligatoire) : le reçu reste, marqué annulé, et son numéro n'est
 *   jamais réutilisé.
 * - Une session de caisse (un caissier, un jour) porte tous les mouvements d'espèces et d'autres moyens ; une fois
 *   clôturée (montant compté, écart justifié), elle ne change plus.
 * - Auteurs : identifiant et nom recopiés, sans clé étrangère vers users (un compte effacé ne doit ni modifier ni
 *   bloquer l'historique comptable).
 */
return new class extends Migration
{
    private const array LEDGER = ['payments', 'payment_cancellations', 'refunds', 'credit_transfers'];

    public function up(): void
    {
        // Ligne « départ » (négative) : échéances des périodes non commencées à la date du départ, annulées
        DB::statement('ALTER TABLE invoice_lines DROP CONSTRAINT invoice_lines_sign');
        DB::statement("ALTER TABLE invoice_lines ADD CONSTRAINT invoice_lines_sign CHECK ((kind IN ('discount', 'departure') AND amount < 0) OR (kind NOT IN ('discount', 'departure') AND amount > 0))");

        Schema::create('cash_sessions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('cashier_id');
            $table->string('cashier_name', 120);
            $table->date('business_date'); // jour de caisse (Africa/Abidjan)
            $table->timestampTz('closed_at')->nullable();
            $table->uuid('closed_by')->nullable();
            $table->bigInteger('expected_cash')->nullable(); // espèces attendues à la clôture
            $table->bigInteger('counted_cash')->nullable();
            $table->string('note', 200)->nullable(); // obligatoire si écart
            $table->timestamps();

            $table->unique(['school_id', 'cashier_id', 'business_date']);
            $table->unique(['id', 'school_id']);
            $table->index(['school_id', 'business_date']);
        });
        DB::statement('ALTER TABLE cash_sessions ADD CONSTRAINT cash_sessions_counted CHECK (counted_cash IS NULL OR counted_cash >= 0)');
        Rls::enable('cash_sessions');

        Schema::create('payments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('invoice_id');
            $table->uuid('cash_session_id');
            $table->string('receipt_number', 20); // REC-2026-000123
            $table->bigInteger('amount');
            $table->string('method', 20); // App\Domains\Billing\Enums\PaymentMethod
            $table->string('reference', 60)->nullable(); // référence de l'opérateur, du chèque, du virement
            $table->string('payer_name', 120);
            $table->uuid('cashier_id');
            $table->string('cashier_name', 120);
            $table->timestampTz('paid_at');
            $table->timestamps();

            $table->foreign(['invoice_id', 'school_id'])->references(['id', 'school_id'])->on('invoices')->restrictOnDelete();
            $table->foreign(['cash_session_id', 'school_id'])->references(['id', 'school_id'])->on('cash_sessions')->restrictOnDelete();
            $table->unique(['school_id', 'receipt_number']);
            $table->unique(['id', 'school_id']);
            $table->index(['invoice_id', 'paid_at']);
        });
        DB::statement('ALTER TABLE payments ADD CONSTRAINT payments_amount CHECK (amount > 0)');
        // Une même référence d'opérateur ne s'enregistre qu'une fois (double saisie)
        DB::statement('CREATE UNIQUE INDEX payments_one_reference ON payments (school_id, method, reference) WHERE reference IS NOT NULL');
        Rls::enable('payments');

        Schema::create('payment_cancellations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('payment_id');
            $table->uuid('cash_session_id'); // session où l'annulation est comptée
            $table->string('reason', 200);
            $table->uuid('cancelled_by');
            $table->string('cancelled_by_name', 120);
            $table->timestamps();

            $table->foreign(['payment_id', 'school_id'])->references(['id', 'school_id'])->on('payments')->restrictOnDelete();
            $table->foreign(['cash_session_id', 'school_id'])->references(['id', 'school_id'])->on('cash_sessions')->restrictOnDelete();
            $table->unique('payment_id');
        });
        Rls::enable('payment_cancellations');

        Schema::create('refunds', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('invoice_id');
            $table->uuid('cash_session_id');
            $table->string('number', 20); // RMB-2026-000001
            $table->bigInteger('amount');
            $table->string('method', 20);
            $table->string('reference', 60)->nullable();
            $table->string('reason', 200);
            $table->uuid('refunded_by');
            $table->string('refunded_by_name', 120);
            $table->timestamps();

            $table->foreign(['invoice_id', 'school_id'])->references(['id', 'school_id'])->on('invoices')->restrictOnDelete();
            $table->foreign(['cash_session_id', 'school_id'])->references(['id', 'school_id'])->on('cash_sessions')->restrictOnDelete();
            $table->unique(['school_id', 'number']);
            $table->index('invoice_id');
        });
        DB::statement('ALTER TABLE refunds ADD CONSTRAINT refunds_amount CHECK (amount > 0)');
        Rls::enable('refunds');

        // Trop-perçu reporté sur une autre facture du même payeur (fratrie, année suivante) : aucun mouvement d'argent
        Schema::create('credit_transfers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('from_invoice_id');
            $table->uuid('to_invoice_id');
            $table->bigInteger('amount');
            $table->string('reason', 200);
            $table->uuid('created_by');
            $table->string('created_by_name', 120);
            $table->timestamps();

            $table->foreign(['from_invoice_id', 'school_id'])->references(['id', 'school_id'])->on('invoices')->restrictOnDelete();
            $table->foreign(['to_invoice_id', 'school_id'])->references(['id', 'school_id'])->on('invoices')->restrictOnDelete();
            $table->index('from_invoice_id');
            $table->index('to_invoice_id');
        });
        DB::statement('ALTER TABLE credit_transfers ADD CONSTRAINT credit_transfers_amount CHECK (amount > 0 AND from_invoice_id <> to_invoice_id)');
        Rls::enable('credit_transfers');

        // Immuabilité : aucun UPDATE, quel que soit le rôle ; une session clôturée ne change plus
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION forbid_ledger_update() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                RAISE EXCEPTION 'Écriture comptable immuable (%) : enregistrez une annulation.', TG_TABLE_NAME
                    USING ERRCODE = 'restrict_violation';
            END
            $$
            SQL);
        DB::statement(<<<'SQL'
            CREATE OR REPLACE FUNCTION forbid_closed_cash_session_update() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                IF OLD.closed_at IS NOT NULL THEN
                    RAISE EXCEPTION 'Session de caisse clôturée : elle ne change plus.' USING ERRCODE = 'restrict_violation';
                END IF;
                RETURN NEW;
            END
            $$
            SQL);
        foreach (self::LEDGER as $table) {
            DB::statement("CREATE TRIGGER {$table}_immutable BEFORE UPDATE ON {$table} FOR EACH ROW EXECUTE FUNCTION forbid_ledger_update()");
        }
        DB::statement('CREATE TRIGGER cash_sessions_closed BEFORE UPDATE ON cash_sessions FOR EACH ROW EXECUTE FUNCTION forbid_closed_cash_session_update()');

        // La connexion applicative n'efface rien (les suppressions en cascade d'une école restent possibles : elles
        // s'exécutent avec les droits du propriétaire des tables)
        $tables = implode(', ', [...self::LEDGER, 'cash_sessions']);
        DB::statement(<<<SQL
            DO \$\$
            BEGIN
                IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
                    REVOKE UPDATE, DELETE ON {$tables} FROM app_user;
                    GRANT UPDATE ON cash_sessions TO app_user;
                END IF;
                IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_platform') THEN
                    REVOKE UPDATE, DELETE ON {$tables} FROM app_platform;
                    GRANT UPDATE ON cash_sessions TO app_platform;
                END IF;
            END
            \$\$
            SQL);
    }

    public function down(): void
    {
        foreach (['credit_transfers', 'refunds', 'payment_cancellations', 'payments', 'cash_sessions'] as $table) {
            Schema::dropIfExists($table);
        }
        DB::statement('DROP FUNCTION IF EXISTS forbid_ledger_update()');
        DB::statement('DROP FUNCTION IF EXISTS forbid_closed_cash_session_update()');
        DB::statement("DELETE FROM invoice_lines WHERE kind = 'departure'");
        DB::statement('ALTER TABLE invoice_lines DROP CONSTRAINT invoice_lines_sign');
        DB::statement("ALTER TABLE invoice_lines ADD CONSTRAINT invoice_lines_sign CHECK ((kind = 'discount' AND amount < 0) OR (kind <> 'discount' AND amount > 0))");
    }
};
