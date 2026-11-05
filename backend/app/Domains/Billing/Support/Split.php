<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use InvalidArgumentException;

/** Répartition d'un montant entier (FCFA) en parts entières ; le reste de la division va sur la dernière part. */
final class Split
{
    /**
     * @return list<int>
     */
    public static function evenly(int $amount, int $parts): array
    {
        if ($parts < 1) {
            throw new InvalidArgumentException('Au moins une part.');
        }

        $share = intdiv($amount, $parts);
        $shares = array_fill(0, $parts, $share);
        $shares[$parts - 1] = $amount - $share * ($parts - 1);

        return array_values($shares);
    }
}
