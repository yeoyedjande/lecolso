<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Data\GradeGridView;
use App\Domains\Grading\Data\GradingInput;
use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Models\Grade;
use App\Domains\Grading\Support\ClassroomGrading;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\GradingCatalog;
use App\Domains\Grading\Support\GradingRoster;
use App\Domains\Grading\Support\WeightedAverageStrategy;
use App\Domains\Identity\Models\User;
use App\Support\Cycles\Enums\AssessmentMode;
use App\Support\Http\BusinessConflict;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Grille de notes : période (celle du jour par défaut) et matière (la première par défaut), évaluations par date,
 * note de chaque élève et moyenne de la matière sur l'échelle du cycle. 409 wrong_mode hors moyenne pondérée.
 */
final readonly class ShowGradeGrid
{
    public function __construct(
        private GradingAccess $access,
        private GradingCatalog $catalog,
        private ClassroomGrading $grading,
    ) {}

    public function handle(User $user, Classroom $classroom, ?string $termId, ?string $subjectId, Carbon $now): GradeGridView
    {
        $classroom->loadMissing(['level.cycle', 'academicYear']);
        $settings = $classroom->level->cycle->settings;
        if ($settings->assessmentMode !== AssessmentMode::WeightedAverage) {
            throw new BusinessConflict('wrong_mode', 'Ce cycle n’est pas noté par matières.');
        }

        $terms = $this->grading->terms($classroom);
        $term = $this->grading->pick($terms, $termId, $now);
        $subjects = $this->catalog->subjects($classroom->academicYear, $classroom->level);
        $subject = $subjectId === null ? $subjects->first() : ($subjects->firstWhere('id', $subjectId)
            ?? throw ValidationException::withMessages(['subject_id' => 'Matière inconnue pour cette classe.']));

        $assessments = $subject === null ? new Collection : Assessment::query()
            ->where('classroom_id', $classroom->id)
            ->where('term_id', $term->id)
            ->where('subject_id', $subject->id)
            ->orderBy('date')
            ->orderBy('created_at')
            ->get();
        $students = GradingRoster::of($classroom, $term);
        $all = Grade::query()->whereIn('assessment_id', $assessments->modelKeys())->get();
        $grades = $all->groupBy('student_id');

        $averages = $subject === null ? null : (new WeightedAverageStrategy)->compute(new GradingInput(
            $settings->gradeScale,
            array_values(array_map(strval(...), $students->modelKeys())),
            [$subject->id => 1],
            $assessments->mapWithKeys(static fn (Assessment $assessment): array => [$assessment->id => ['subject_id' => $assessment->subject_id, 'out_of' => $assessment->out_of]])->all(),
            array_values($all->map(static fn (Grade $grade): array => ['assessment_id' => $grade->assessment_id, 'student_id' => $grade->student_id, 'score' => $grade->score()])->all()),
        ));

        $rows = [];
        foreach ($students as $student) {
            $row = [];
            foreach ($grades->get($student->id) ?? [] as $grade) {
                $row[$grade->assessment_id] = $grade;
            }
            $rows[] = ['student' => $student, 'grades' => $row, 'average' => $averages?->for($student->id)?->average];
        }

        return new GradeGridView(
            $classroom,
            $terms,
            $term,
            $subjects,
            $subject,
            $assessments,
            $rows,
            $classroom->academicYear->status === AcademicYearStatus::Open && $this->access->canManage($user, $classroom),
        );
    }
}
