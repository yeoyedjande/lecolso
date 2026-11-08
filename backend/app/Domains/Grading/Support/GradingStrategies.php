<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use App\Domains\Grading\Contracts\GradingStrategy;
use App\Support\Cycles\CycleSettings;
use App\Support\Cycles\Enums\AssessmentMode;

/** Stratégie de calcul d'après le mode d'évaluation du cycle, jamais d'après son nom. */
final class GradingStrategies
{
    public static function for(CycleSettings $settings): ?GradingStrategy
    {
        return match ($settings->assessmentMode) {
            AssessmentMode::WeightedAverage => new WeightedAverageStrategy,
            AssessmentMode::Competency => new CompetencyStrategy,
            AssessmentMode::Observation => null,
        };
    }
}
