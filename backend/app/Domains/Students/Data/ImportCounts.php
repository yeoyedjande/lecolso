<?php

declare(strict_types=1);

namespace App\Domains\Students\Data;

/** Totaux d'un import : lignes vérifiées, inscrites, ignorées (déjà inscrites) et en erreur. */
final readonly class ImportCounts
{
    public function __construct(
        public int $ready,
        public int $created,
        public int $skipped,
        public int $error,
    ) {}
}
