<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use Illuminate\Support\Facades\DB;

/**
 * Verrou consultatif PostgreSQL de la transaction en cours (libéré au COMMIT ou au ROLLBACK) : deux saisies
 * simultanées de la même liste (notes d'une évaluation, première création des périodes…) passent l'une après l'autre,
 * sans conflit d'unicité.
 */
final class GradingLock
{
    public static function acquire(string ...$keys): void
    {
        // Aucune table lue ni écrite : simple verrou, clé propre à la liste (identifiants UUID uniques)
        DB::select('SELECT pg_advisory_xact_lock(hashtext(?))', ['grading:'.implode(':', $keys)]);
    }
}
