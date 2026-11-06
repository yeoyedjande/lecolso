<?php

declare(strict_types=1);

use App\Domains\Grading\Data\GradingInput;
use App\Domains\Grading\Enums\SkillLevel;
use App\Domains\Grading\Support\CompetencyStrategy;
use App\Domains\Grading\Support\WeightedAverageStrategy;
use App\Support\Cycles\Enums\GradeScale;

it('ramène les notes sur l’échelle, pondère les matières et classe avec des ex aequo', function (): void {
    $input = new GradingInput(
        GradeScale::Ten,
        ['awa', 'yao', 'ama', 'kofi'],
        ['fr' => 3, 'maths' => 1],
        [
            'dictee' => ['subject_id' => 'fr', 'out_of' => 20],
            'redaction' => ['subject_id' => 'fr', 'out_of' => 10],
            'calcul' => ['subject_id' => 'maths', 'out_of' => 10],
        ],
        [
            // Awa : français (14/20 → 7 ; 9/10) = 8 ; maths 6 → (8×3 + 6) / 4 = 7,50
            ['assessment_id' => 'dictee', 'student_id' => 'awa', 'score' => 14.0],
            ['assessment_id' => 'redaction', 'student_id' => 'awa', 'score' => 9.0],
            ['assessment_id' => 'calcul', 'student_id' => 'awa', 'score' => 6.0],
            // Yao : absent à la dictée (ignorée), français 7,5 ; maths 7,5 → 7,50 (ex aequo)
            ['assessment_id' => 'dictee', 'student_id' => 'yao', 'score' => null],
            ['assessment_id' => 'redaction', 'student_id' => 'yao', 'score' => 7.5],
            ['assessment_id' => 'calcul', 'student_id' => 'yao', 'score' => 7.5],
            // Ama : maths seulement → 4
            ['assessment_id' => 'calcul', 'student_id' => 'ama', 'score' => 4.0],
            // Kofi : aucune note
        ],
    );

    $results = (new WeightedAverageStrategy)->compute($input);

    expect($results->for('awa')?->subjects)->toBe(['fr' => 8.0, 'maths' => 6.0])
        ->and($results->for('awa')?->average)->toBe(7.5)
        ->and($results->for('yao')?->subjects)->toBe(['fr' => 7.5, 'maths' => 7.5])
        ->and($results->for('yao')?->average)->toBe(7.5)
        ->and($results->for('ama')?->average)->toBe(4.0)
        ->and($results->for('kofi')?->average)->toBeNull()
        ->and([$results->for('awa')?->rank, $results->for('yao')?->rank, $results->for('ama')?->rank, $results->for('kofi')?->rank])->toBe([1, 1, 3, null])
        ->and($results->classAverage)->toBe(6.33)
        ->and($results->highest)->toBe(7.5)
        ->and($results->lowest)->toBe(4.0);
});

it('calcule sur 20 quand le cycle le demande et arrondit à deux décimales', function (): void {
    $input = new GradingInput(
        GradeScale::Twenty,
        ['awa'],
        ['fr' => 1],
        ['a' => ['subject_id' => 'fr', 'out_of' => 3], 'b' => ['subject_id' => 'fr', 'out_of' => 3]],
        [
            ['assessment_id' => 'a', 'student_id' => 'awa', 'score' => 1.0],
            ['assessment_id' => 'b', 'student_id' => 'awa', 'score' => 1.0],
        ],
    );

    expect((new WeightedAverageStrategy)->compute($input)->for('awa')?->average)->toBe(6.67);
});

it('compte les compétences acquises, en cours et non acquises sans moyenne ni rang', function (): void {
    $results = (new CompetencyStrategy)->compute(new GradingInput(GradeScale::Ten, ['awa', 'yao'], skillLevels: [
        ['student_id' => 'awa', 'level' => SkillLevel::Acquired],
        ['student_id' => 'awa', 'level' => SkillLevel::Acquired],
        ['student_id' => 'awa', 'level' => SkillLevel::InProgress],
        ['student_id' => 'yao', 'level' => SkillLevel::NotAcquired],
        ['student_id' => 'autre', 'level' => SkillLevel::Acquired],
    ]));

    expect($results->for('awa')?->skills)->toBe(['A' => 2, 'EA' => 1, 'NA' => 0])
        ->and($results->for('yao')?->skills)->toBe(['A' => 0, 'EA' => 0, 'NA' => 1])
        ->and($results->for('awa')?->rank)->toBeNull()
        ->and($results->classAverage)->toBeNull();
});
