<?php

declare(strict_types=1);

namespace App\Domains\Grading\Contracts;

use App\Domains\Grading\Data\ClassResults;
use App\Domains\Grading\Data\GradingInput;

/**
 * Calcul des résultats d'une classe pour une période, propre au mode d'évaluation du cycle (assessment_mode) :
 * WeightedAverageStrategy (notes et moyennes pondérées), CompetencyStrategy (compétences) ; LmdCreditStrategy en V3.
 * Calcul pur : aucune lecture en base.
 */
interface GradingStrategy
{
    public function compute(GradingInput $input): ClassResults;
}
