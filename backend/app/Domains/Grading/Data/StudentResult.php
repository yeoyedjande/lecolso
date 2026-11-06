<?php

declare(strict_types=1);

namespace App\Domains\Grading\Data;

/** Résultat d'un élève pour une période. */
final readonly class StudentResult
{
    /**
     * @param  array<string, float|null>  $subjects  matière → moyenne sur l'échelle du cycle (null : aucune note)
     * @param  array{A: int, EA: int, NA: int}|null  $skills  compétences évaluées par niveau (cycles en compétences)
     */
    public function __construct(
        public string $studentId,
        public array $subjects,
        public ?float $average,
        public ?int $rank,
        public ?array $skills = null,
    ) {}
}
