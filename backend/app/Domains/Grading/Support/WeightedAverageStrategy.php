<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use App\Domains\Grading\Contracts\GradingStrategy;
use App\Domains\Grading\Data\ClassResults;
use App\Domains\Grading\Data\GradingInput;
use App\Domains\Grading\Data\StudentResult;

/**
 * Notes et moyennes pondérées (décision du 06/11/2026) :
 * - chaque note est ramenée sur l'échelle du cycle (sur 10, ou 20 en V2) : 14/20 → 7/10 ;
 * - moyenne d'une matière = moyenne des notes ramenées (absences et notes non saisies ignorées), arrondie à 2 décimales ;
 * - moyenne générale = moyennes de matière arrondies pondérées par les coefficients (matières sans note ignorées),
 *   arrondie à 2 décimales : elle se recalcule à la main depuis le bulletin ;
 * - rang par moyenne générale décroissante, ex aequo au même rang (1, 1, 3) ; sans moyenne : pas de rang ;
 * - moyenne de classe = moyenne des moyennes générales, avec la plus forte et la plus faible.
 */
final class WeightedAverageStrategy implements GradingStrategy
{
    public function compute(GradingInput $input): ClassResults
    {
        $max = $input->scale->max();
        /** @var array<string, array<string, list<float>>> $scores élève → matière → notes ramenées */
        $scores = [];
        foreach ($input->grades as $grade) {
            $assessment = $input->assessments[$grade['assessment_id']] ?? null;
            if ($assessment === null || $grade['score'] === null || $assessment['out_of'] <= 0) {
                continue;
            }
            $scores[$grade['student_id']][$assessment['subject_id']][] = $grade['score'] / $assessment['out_of'] * $max;
        }

        $averages = [];
        $subjectAverages = [];
        foreach ($input->studentIds as $studentId) {
            $weighted = 0.0;
            $weights = 0;
            $subjectAverages[$studentId] = [];
            foreach ($input->subjects as $subjectId => $coefficient) {
                $marks = $scores[$studentId][$subjectId] ?? [];
                $average = $marks === [] ? null : round(array_sum($marks) / count($marks), 2);
                $subjectAverages[$studentId][$subjectId] = $average;
                if ($average !== null) {
                    $weighted += $average * $coefficient;
                    $weights += $coefficient;
                }
            }
            $averages[$studentId] = $weights === 0 ? null : round($weighted / $weights, 2);
        }

        $ranks = self::ranks($averages);
        $students = [];
        foreach ($input->studentIds as $studentId) {
            $students[] = new StudentResult($studentId, $subjectAverages[$studentId], $averages[$studentId], $ranks[$studentId] ?? null);
        }

        $graded = array_values(array_filter($averages, static fn (?float $average): bool => $average !== null));

        return new ClassResults(
            $students,
            $graded === [] ? null : round(array_sum($graded) / count($graded), 2),
            $graded === [] ? null : max($graded),
            $graded === [] ? null : min($graded),
        );
    }

    /**
     * Rang de compétition : deux élèves à 7,50 sont 1ers, le suivant est 3e.
     *
     * @param  array<string, float|null>  $averages
     * @return array<string, int>
     */
    public static function ranks(array $averages): array
    {
        $graded = array_filter($averages, static fn (?float $average): bool => $average !== null);
        arsort($graded);
        $ranks = [];
        $position = 0;
        $previous = null;
        $rank = 0;
        foreach ($graded as $studentId => $average) {
            $position++;
            if ($previous === null || $average < $previous) {
                $rank = $position;
                $previous = $average;
            }
            $ranks[(string) $studentId] = $rank;
        }

        return $ranks;
    }
}
