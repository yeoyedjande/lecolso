<?php

declare(strict_types=1);

namespace App\Support\Cycles\Enums;

/** Mode d'évaluation (paramètre du cycle). */
enum AssessmentMode: string
{
    /** Carnet de suivi (garderie) */
    case Observation = 'observation';

    /** Compétences */
    case Competency = 'competency';

    /** Notes et moyennes pondérées */
    case WeightedAverage = 'weighted_average';

}
