<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

/**
 * Tarifs publiés sur la page publique : année en cours, types de frais ayant un montant, et montants annuels (FCFA)
 * par niveau (`amounts` : code du type de frais → montant).
 */
final readonly class PublicFeeGrid
{
    /**
     * @param  list<array{code: string, name: string, optional: bool}>  $feeTypes
     * @param  list<array{cycle_name: string, level_code: string, level_name: string, amounts: array<string, int>}>  $levels
     */
    public function __construct(
        public string $yearLabel,
        public array $feeTypes,
        public array $levels,
    ) {}
}
