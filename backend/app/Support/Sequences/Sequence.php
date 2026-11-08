<?php

declare(strict_types=1);

namespace App\Support\Sequences;

use App\Support\Database\Rls;
use Illuminate\Support\Facades\DB;
use LogicException;

/**
 * Numéro suivant d'un compteur de l'école courante (table document_sequences), à appeler dans la transaction
 * qui enregistre le document : la ligne du compteur reste verrouillée jusqu'à la fin de la transaction
 * (deux inscriptions simultanées attendent l'une l'autre) et un échec rend le numéro.
 */
final class Sequence
{
    public const string STUDENT_MATRICULE = 'student_matricule';

    public function next(string $key): int
    {
        if (DB::transactionLevel() === 0) {
            throw new LogicException('Un numéro de séquence se prend dans la transaction qui enregistre le document.');
        }

        // SQL brut justifié : incrément atomique (INSERT … ON CONFLICT … RETURNING), impossible avec le query builder
        // sans lecture préalable. L'école est celle du contexte : la politique RLS de la table s'applique.
        $row = DB::selectOne(
            'INSERT INTO document_sequences (id, school_id, key, last_value, created_at, updated_at)
             VALUES (gen_random_uuid(), '.Rls::CURRENT_SCHOOL.', ?, 1, now(), now())
             ON CONFLICT (school_id, key) DO UPDATE
                SET last_value = document_sequences.last_value + 1, updated_at = now()
             RETURNING last_value',
            [$key],
        );

        if (! is_object($row) || ! property_exists($row, 'last_value') || ! is_numeric($row->last_value)) {
            throw new LogicException('Compteur indisponible : aucune école courante.');
        }

        return (int) $row->last_value;
    }
}
