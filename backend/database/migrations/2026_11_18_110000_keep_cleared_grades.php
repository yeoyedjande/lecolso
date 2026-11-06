<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Note ou compétence effacée : la ligne reste, vide (note sans valeur ni absence, compétence sans niveau), avec la date
 * de l'effacement. Une saisie hors connexion plus ancienne ne fait donc pas revenir une valeur effacée depuis.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE grades DROP CONSTRAINT grades_value');
        DB::statement('ALTER TABLE grades ADD CONSTRAINT grades_value CHECK ((absent AND value IS NULL) OR (NOT absent AND (value IS NULL OR value >= 0)))');

        DB::statement('ALTER TABLE skill_evaluations ALTER COLUMN level DROP NOT NULL');
        DB::statement('ALTER TABLE skill_evaluations DROP CONSTRAINT skill_evaluations_level');
        DB::statement("ALTER TABLE skill_evaluations ADD CONSTRAINT skill_evaluations_level CHECK (level IS NULL OR level IN ('A', 'EA', 'NA'))");
    }

    public function down(): void
    {
        DB::statement('DELETE FROM grades WHERE value IS NULL AND NOT absent');
        DB::statement('ALTER TABLE grades DROP CONSTRAINT grades_value');
        DB::statement('ALTER TABLE grades ADD CONSTRAINT grades_value CHECK ((absent AND value IS NULL) OR (NOT absent AND value IS NOT NULL AND value >= 0))');

        DB::statement('DELETE FROM skill_evaluations WHERE level IS NULL');
        DB::statement('ALTER TABLE skill_evaluations DROP CONSTRAINT skill_evaluations_level');
        DB::statement("ALTER TABLE skill_evaluations ADD CONSTRAINT skill_evaluations_level CHECK (level IN ('A', 'EA', 'NA'))");
        DB::statement('ALTER TABLE skill_evaluations ALTER COLUMN level SET NOT NULL');
    }
};
