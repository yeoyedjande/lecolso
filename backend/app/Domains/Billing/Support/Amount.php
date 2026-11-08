<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Billing\Models\FeeSchedule;
use Illuminate\Support\Collection;

/** Montants entiers (FCFA) lus en base : agrégats SQL (chaînes) ou colonnes, jamais de flottant. */
final class Amount
{
    public static function of(mixed $value): int
    {
        return is_int($value) ? $value : (is_numeric($value) ? (int) $value : 0);
    }

    /**
     * Somme d'un attribut entier d'une collection de modèles.
     *
     * @param  iterable<object>  $items
     */
    public static function sum(iterable $items, string $attribute = 'amount'): int
    {
        $total = 0;
        foreach ($items as $item) {
            $total += self::of($item->{$attribute} ?? 0);
        }

        return $total;
    }

    /**
     * Montants de la grille d'un niveau pour une année : type de frais => montant.
     *
     * @param  Collection<int, FeeSchedule>  $schedules
     * @return array<string, int>
     */
    public static function byFeeType(Collection $schedules): array
    {
        $amounts = [];
        foreach ($schedules as $schedule) {
            $amounts[$schedule->fee_type_id] = $schedule->amount;
        }

        return $amounts;
    }
}
