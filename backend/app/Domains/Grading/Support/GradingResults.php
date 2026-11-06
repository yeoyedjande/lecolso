<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Data\ClassResults;
use App\Domains\Grading\Data\GradingInput;
use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Models\Grade;
use App\Domains\Grading\Models\SkillEvaluation;
use App\Domains\Grading\Models\Subject;
use App\Domains\Grading\Models\Term;
use App\Domains\Students\Models\Student;
use Illuminate\Database\Eloquent\Collection;

/** Lit les notes (ou compétences) d'une classe pour une période et les passe à la stratégie du cycle. */
final class GradingResults
{
    /**
     * @param  Collection<int, Student>  $students
     * @param  Collection<int, Subject>  $subjects
     */
    public function compute(Classroom $classroom, Term $term, Collection $students, Collection $subjects): ClassResults
    {
        $settings = $classroom->level->cycle->settings;
        $strategy = GradingStrategies::for($settings);
        $studentIds = array_values(array_map(strval(...), $students->modelKeys()));
        if ($strategy === null) {
            return new ClassResults([]);
        }

        $assessments = Assessment::query()->where('classroom_id', $classroom->id)->where('term_id', $term->id)->get();
        $grades = Grade::query()->whereIn('assessment_id', $assessments->modelKeys())->whereIn('student_id', $studentIds)->get();
        $levels = SkillEvaluation::query()->where('term_id', $term->id)->whereIn('student_id', $studentIds)->whereNotNull('level')->get();

        $skillLevels = [];
        foreach ($levels as $evaluation) {
            if ($evaluation->level !== null) {
                $skillLevels[] = ['student_id' => $evaluation->student_id, 'level' => $evaluation->level];
            }
        }
        $subjectMap = [];
        foreach ($subjects as $subject) {
            $subjectMap[$subject->id] = $subject->coefficient;
        }
        $assessmentMap = [];
        foreach ($assessments as $assessment) {
            $assessmentMap[$assessment->id] = ['subject_id' => $assessment->subject_id, 'out_of' => $assessment->out_of];
        }

        return $strategy->compute(new GradingInput(
            $settings->gradeScale,
            $studentIds,
            $subjectMap,
            $assessmentMap,
            array_values($grades->map(static fn (Grade $grade): array => ['assessment_id' => $grade->assessment_id, 'student_id' => $grade->student_id, 'score' => $grade->score()])->all()),
            $skillLevels,
        ));
    }
}
