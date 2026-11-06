<?php

declare(strict_types=1);

namespace App\Domains\Grading\Data;

/** Résultats d'une classe pour une période : un résultat par élève, moyenne de classe, plus forte et plus faible. */
final readonly class ClassResults
{
    /**
     * @param  list<StudentResult>  $students
     */
    public function __construct(
        public array $students,
        public ?float $classAverage = null,
        public ?float $highest = null,
        public ?float $lowest = null,
    ) {}

    public function for(string $studentId): ?StudentResult
    {
        foreach ($this->students as $result) {
            if ($result->studentId === $studentId) {
                return $result;
            }
        }

        return null;
    }
}
