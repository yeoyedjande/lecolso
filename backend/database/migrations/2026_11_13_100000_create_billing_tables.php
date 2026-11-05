<?php

declare(strict_types=1);

use App\Support\Database\Rls;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Facturation (lot 5a) : types de frais, grille par niveau et par année, calendrier des échéances par cycle, payeurs,
 * factures (une par inscription), lignes et échéances. Montants en entiers (FCFA, sans centimes).
 *
 * - Une ligne de remise est négative ; toutes les autres sont positives. La somme des échéances d'une ligne est égale
 *   à son montant (contrôlé par l'Action qui les crée).
 * - Le solde se calcule en affectant les paiements (lot 5b) aux échéances par date : aucune répartition stockée, qui
 *   deviendrait fausse au premier changement de facture.
 * - Payeur : le tuteur payeur de l'élève (V1) ; la table prévoit l'élève lui-même et l'entreprise.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Cible des clés composites des factures
        Schema::table('enrollments', function (Blueprint $table): void {
            $table->unique(['id', 'school_id']);
        });

        Schema::create('fee_types', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->string('code', 40);
            $table->string('name', 80);
            $table->string('billing', 10); // App\Domains\Billing\Enums\FeeBilling
            $table->boolean('is_optional')->default(false);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->unique(['school_id', 'code']);
            $table->unique(['id', 'school_id']);
        });
        Rls::enable('fee_types');

        // Écoles existantes : types de frais du catalogue (migration : rôle propriétaire, toutes les écoles)
        $catalog = (array) config('billing.fee_types');
        foreach (DB::table('schools')->pluck('id') as $schoolId) {
            $position = 0;
            foreach ($catalog as $code => $type) {
                if (! is_array($type)) {
                    continue;
                }
                DB::table('fee_types')->insert([
                    'id' => (string) Str::uuid7(),
                    'school_id' => $schoolId,
                    'code' => $code,
                    'name' => $type['name'],
                    'billing' => $type['billing'],
                    'is_optional' => $type['optional'],
                    'position' => $position++,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        Schema::create('fee_schedules', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('academic_year_id');
            $table->uuid('level_id');
            $table->uuid('fee_type_id');
            $table->bigInteger('amount'); // FCFA, montant annuel
            $table->timestamps();

            $table->foreign(['academic_year_id', 'school_id'])->references(['id', 'school_id'])->on('academic_years')->cascadeOnDelete();
            $table->foreign(['level_id', 'school_id'])->references(['id', 'school_id'])->on('levels')->cascadeOnDelete();
            $table->foreign(['fee_type_id', 'school_id'])->references(['id', 'school_id'])->on('fee_types')->cascadeOnDelete();
            $table->unique(['school_id', 'academic_year_id', 'level_id', 'fee_type_id']);
        });
        DB::statement('ALTER TABLE fee_schedules ADD CONSTRAINT fee_schedules_amount CHECK (amount >= 0)');
        Rls::enable('fee_schedules');

        Schema::create('installment_dates', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('academic_year_id');
            $table->uuid('cycle_id');
            $table->unsignedSmallInteger('position');
            $table->date('due_on');
            $table->string('label', 60);
            $table->timestamps();

            $table->foreign(['academic_year_id', 'school_id'])->references(['id', 'school_id'])->on('academic_years')->cascadeOnDelete();
            $table->foreign(['cycle_id', 'school_id'])->references(['id', 'school_id'])->on('cycles')->cascadeOnDelete();
            $table->unique(['school_id', 'academic_year_id', 'cycle_id', 'position']);
        });
        Rls::enable('installment_dates');

        Schema::create('payers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 10); // App\Domains\Billing\Enums\PayerKind
            $table->uuid('guardian_id')->nullable();
            $table->string('name', 120); // nom au moment de la facturation (le tuteur peut être effacé)
            $table->timestamps();

            $table->unique(['id', 'school_id']);
        });
        // Un tuteur effacé laisse le payeur (historique des factures) : seule la colonne guardian_id est vidée
        DB::statement('ALTER TABLE payers ADD CONSTRAINT payers_guardian FOREIGN KEY (guardian_id, school_id) REFERENCES guardians (id, school_id) ON DELETE SET NULL (guardian_id)');
        DB::statement('CREATE UNIQUE INDEX payers_one_per_guardian ON payers (school_id, guardian_id) WHERE guardian_id IS NOT NULL');
        Rls::enable('payers');

        Schema::create('invoices', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('enrollment_id');
            $table->uuid('student_id');
            $table->uuid('academic_year_id');
            $table->uuid('payer_id')->nullable();
            $table->timestamps();

            $table->foreign(['enrollment_id', 'school_id'])->references(['id', 'school_id'])->on('enrollments')->cascadeOnDelete();
            $table->foreign(['student_id', 'school_id'])->references(['id', 'school_id'])->on('students')->cascadeOnDelete();
            $table->foreign(['academic_year_id', 'school_id'])->references(['id', 'school_id'])->on('academic_years')->cascadeOnDelete();
            $table->unique('enrollment_id');
            $table->unique(['id', 'school_id']);
            $table->index(['school_id', 'academic_year_id']);
        });
        DB::statement('ALTER TABLE invoices ADD CONSTRAINT invoices_payer FOREIGN KEY (payer_id, school_id) REFERENCES payers (id, school_id) ON DELETE SET NULL (payer_id)');
        Rls::enable('invoices');

        Schema::create('invoice_lines', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('invoice_id');
            $table->uuid('fee_type_id')->nullable();
            $table->string('kind', 10); // App\Domains\Billing\Enums\LineKind
            $table->string('label', 120);
            $table->bigInteger('amount'); // FCFA ; négatif pour une remise
            $table->string('reason', 200)->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign(['invoice_id', 'school_id'])->references(['id', 'school_id'])->on('invoices')->cascadeOnDelete();
            $table->foreign(['fee_type_id', 'school_id'])->references(['id', 'school_id'])->on('fee_types')->restrictOnDelete();
            $table->unique(['id', 'school_id']);
        });
        DB::statement("ALTER TABLE invoice_lines ADD CONSTRAINT invoice_lines_sign CHECK ((kind = 'discount' AND amount < 0) OR (kind <> 'discount' AND amount > 0))");
        // Un type de frais une seule fois par facture
        DB::statement('CREATE UNIQUE INDEX invoice_lines_one_fee ON invoice_lines (invoice_id, fee_type_id) WHERE fee_type_id IS NOT NULL');
        Rls::enable('invoice_lines');

        Schema::create('installments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->uuid('invoice_id');
            $table->uuid('invoice_line_id');
            $table->date('due_on');
            $table->string('label', 60);
            $table->bigInteger('amount'); // FCFA ; négatif pour la part d'une remise
            $table->timestamps();

            $table->foreign(['invoice_id', 'school_id'])->references(['id', 'school_id'])->on('invoices')->cascadeOnDelete();
            $table->foreign(['invoice_line_id', 'school_id'])->references(['id', 'school_id'])->on('invoice_lines')->cascadeOnDelete();
            $table->index(['school_id', 'due_on']);
            $table->index(['invoice_id', 'due_on']);
        });
        Rls::enable('installments');
    }

    public function down(): void
    {
        Schema::dropIfExists('installments');
        Schema::dropIfExists('invoice_lines');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('payers');
        Schema::dropIfExists('installment_dates');
        Schema::dropIfExists('fee_schedules');
        Schema::dropIfExists('fee_types');
        Schema::table('enrollments', function (Blueprint $table): void {
            $table->dropUnique(['id', 'school_id']);
        });
    }
};
