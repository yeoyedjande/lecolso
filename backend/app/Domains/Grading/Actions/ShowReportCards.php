<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Data\ReportCardsView;
use App\Domains\Grading\Models\Appreciation;
use App\Domains\Grading\Models\ReportCard;
use App\Domains\Grading\Models\SubjectAppreciation;
use App\Domains\Grading\Models\TermClosure;
use App\Domains\Grading\Support\ClassroomGrading;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\GradingCatalog;
use App\Domains\Grading\Support\GradingResults;
use App\Domains\Grading\Support\GradingRoster;
use App\Domains\Grading\Support\MentionPolicy;
use App\Domains\Identity\Models\User;
use App\Support\Cycles\Enums\ReportDocument;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Carbon;

/** Bulletins d'une classe pour une période (celle du jour par défaut). 409 no_report si le cycle n'a pas de document. */
final readonly class ShowReportCards
{
    public function __construct(
        private GradingAccess $access,
        private GradingCatalog $catalog,
        private ClassroomGrading $grading,
        private GradingResults $results,
    ) {}

    public function handle(User $user, Classroom $classroom, ?string $termId, Carbon $now): ReportCardsView
    {
        $classroom->loadMissing(['level.cycle', 'academicYear']);
        if ($classroom->level->cycle->settings->reportDocument === ReportDocument::None) {
            throw new BusinessConflict('no_report', 'Ce cycle n’a ni bulletin ni livret.');
        }
        $terms = $this->grading->terms($classroom);
        $term = $this->grading->pick($terms, $termId, $now);
        $subjects = $this->catalog->subjects($classroom->academicYear, $classroom->level);
        $students = GradingRoster::of($classroom, $term);
        $results = $this->results->compute($classroom, $term, $students, $subjects);
        $studentIds = $students->modelKeys();

        $appreciations = [];
        foreach (Appreciation::query()->where('term_id', $term->id)->whereIn('student_id', $studentIds)->get() as $appreciation) {
            $appreciations[$appreciation->student_id] = $appreciation;
        }
        $subjectComments = [];
        foreach (SubjectAppreciation::query()->where('term_id', $term->id)->whereIn('student_id', $studentIds)->get() as $comment) {
            $subjectComments[$comment->student_id][$comment->subject_id] = $comment->comment;
        }
        $thresholds = MentionPolicy::thresholds($classroom->level->cycle);
        $proposed = [];
        foreach ($students as $student) {
            $proposed[$student->id] = MentionPolicy::propose($results->for($student->id)?->average, $thresholds);
        }

        $history = TermClosure::query()->where('classroom_id', $classroom->id)->where('term_id', $term->id)->orderByDesc('closed_at')->get();
        $closure = $history->first(static fn (TermClosure $candidate): bool => $candidate->reopened_at === null);
        $reportCards = [];
        if ($closure !== null) {
            foreach (ReportCard::query()->where('term_closure_id', $closure->id)->get() as $card) {
                $reportCards[$card->student_id] = $card;
            }
        }
        $open = $classroom->academicYear->status === AcademicYearStatus::Open;

        return new ReportCardsView(
            $classroom,
            $terms,
            $term,
            $subjects,
            $students,
            $results,
            $appreciations,
            $subjectComments,
            $proposed,
            $closure,
            $reportCards,
            $history,
            $thresholds,
            $open && $closure === null && $this->access->canManage($user, $classroom),
            $open && $this->access->canValidate($user, $classroom),
        );
    }
}
