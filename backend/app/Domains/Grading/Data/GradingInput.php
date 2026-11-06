<?php

declare(strict_types=1);

namespace App\Domains\Grading\Data;

use App\Domains\Grading\Enums\SkillLevel;
use App\Support\Cycles\Enums\GradeScale;

/** Données d'une classe pour une période, lues par GradingResults et passées à la stratégie du cycle. */
final readonly class GradingInput
{
    /**
     * @param  list<string>  $studentIds  élèves de la période, dans l'ordre de la liste
     * @param  array<string, int>  $subjects  matière → coefficient
     * @param  array<string, array{subject_id: string, out_of: int}>  $assessments  évaluation → matière et barème
     * @param  list<array{assessment_id: string, student_id: string, score: float|null}>  $grades  score null : absent
     * @param  list<array{student_id: string, level: SkillLevel}>  $skillLevels
     */
    public function __construct(
        public GradeScale $scale,
        public array $studentIds,
        public array $subjects = [],
        public array $assessments = [],
        public array $grades = [],
        public array $skillLevels = [],
    ) {}
}
