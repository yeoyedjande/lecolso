<?php

declare(strict_types=1);

namespace App\Domains\Students\Data;

/**
 * Résultat d'une ligne : `ready` (vérification seule), `created` (élève inscrit), `skipped` (élève déjà inscrit dans
 * l'école : rien n'est créé, relancer le même fichier ne fait pas de doublon) ou `error` (codes dans `errors`).
 */
final readonly class ImportRowResult
{
    /**
     * @param  list<string>  $errors
     */
    public function __construct(
        public int $line,
        public string $status,
        public array $errors = [],
        public ?string $studentId = null,
        public ?string $matricule = null,
    ) {}
}
