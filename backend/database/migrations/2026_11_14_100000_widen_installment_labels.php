<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Libellé d'une échéance aussi long que celui d'une ligne de facture (120 caractères) : une ligne manuelle au libellé
 * long ne doit pas être refusée par la base.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE installments ALTER COLUMN label TYPE varchar(120)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE installments ALTER COLUMN label TYPE varchar(60) USING left(label, 60)');
    }
};
