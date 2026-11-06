<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use App\Domains\Grading\Contracts\GradingStrategy;
use App\Domains\Grading\Data\ClassResults;
use App\Domains\Grading\Data\GradingInput;
use App\Domains\Grading\Data\StudentResult;
use App\Domains\Grading\Enums\SkillLevel;

/**
 * Compétences (maternelle) : ni moyenne ni rang ; pour chaque élève, le nombre de compétences acquises (A), en cours
 * d'acquisition (EA) et non acquises (NA) sur la période.
 */
final class CompetencyStrategy implements GradingStrategy
{
    public function compute(GradingInput $input): ClassResults
    {
        $counts = [];
        foreach ($input->studentIds as $studentId) {
            $counts[$studentId] = ['A' => 0, 'EA' => 0, 'NA' => 0];
        }
        foreach ($input->skillLevels as $evaluation) {
            if (isset($counts[$evaluation['student_id']])) {
                $key = match ($evaluation['level']) {
                    SkillLevel::Acquired => 'A',
                    SkillLevel::InProgress => 'EA',
                    SkillLevel::NotAcquired => 'NA',
                };
                $counts[$evaluation['student_id']][$key]++;
            }
        }

        $students = [];
        foreach ($input->studentIds as $studentId) {
            $students[] = new StudentResult($studentId, [], null, null, $counts[$studentId]);
        }

        return new ClassResults($students);
    }
}
