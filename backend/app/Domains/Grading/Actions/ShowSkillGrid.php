<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Data\SkillGridView;
use App\Domains\Grading\Models\SkillEvaluation;
use App\Domains\Grading\Support\ClassroomGrading;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\GradingCatalog;
use App\Domains\Grading\Support\GradingRoster;
use App\Domains\Identity\Models\User;
use App\Support\Cycles\Enums\AssessmentMode;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Carbon;

/** Compétences d'une classe pour une période (celle du jour par défaut). 409 wrong_mode hors cycles en compétences. */
final readonly class ShowSkillGrid
{
    public function __construct(
        private GradingAccess $access,
        private GradingCatalog $catalog,
        private ClassroomGrading $grading,
    ) {}

    public function handle(User $user, Classroom $classroom, ?string $termId, Carbon $now): SkillGridView
    {
        $classroom->loadMissing(['level.cycle', 'academicYear']);
        if ($classroom->level->cycle->settings->assessmentMode !== AssessmentMode::Competency) {
            throw new BusinessConflict('wrong_mode', 'Ce cycle n’est pas évalué par compétences.');
        }
        $terms = $this->grading->terms($classroom);
        $term = $this->grading->pick($terms, $termId, $now);
        $skills = $this->catalog->skills($classroom->academicYear, $classroom->level->cycle);
        $students = GradingRoster::of($classroom, $term);
        $evaluations = SkillEvaluation::query()
            ->where('term_id', $term->id)
            ->whereIn('skill_id', $skills->modelKeys())
            ->whereIn('student_id', $students->modelKeys())
            ->get()
            ->groupBy('student_id');

        $rows = [];
        foreach ($students as $student) {
            $levels = [];
            foreach ($evaluations->get($student->id) ?? [] as $evaluation) {
                $levels[$evaluation->skill_id] = $evaluation;
            }
            $rows[] = ['student' => $student, 'levels' => $levels];
        }

        return new SkillGridView(
            $classroom,
            $terms,
            $term,
            $skills,
            $rows,
            $classroom->academicYear->status === AcademicYearStatus::Open && $this->access->canManage($user, $classroom),
        );
    }
}
