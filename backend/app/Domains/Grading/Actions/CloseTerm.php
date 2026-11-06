<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Enums\ReportCardStatus;
use App\Domains\Grading\Jobs\RenderReportCards;
use App\Domains\Grading\Models\Appreciation;
use App\Domains\Grading\Models\ReportCard;
use App\Domains\Grading\Models\TermClosure;
use App\Domains\Grading\Support\ClassroomGrading;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\GradingCatalog;
use App\Domains\Grading\Support\GradingLock;
use App\Domains\Grading\Support\GradingResults;
use App\Domains\Grading\Support\GradingRoster;
use App\Domains\Grading\Support\MentionPolicy;
use App\Domains\Grading\Support\TermLock;
use App\Domains\Identity\Models\User;
use App\Support\Cycles\Enums\ReportDocument;
use App\Support\Http\BusinessConflict;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Validation d'une classe pour une période par la direction (grades.validate) : notes, compétences et appréciations
 * figées, mentions proposées figées (celles choisies sont gardées), un bulletin par élève mis en file de rendu PDF.
 * 409 already_closed, year_closed, no_report (cycle sans document).
 */
final readonly class CloseTerm
{
    public function __construct(
        private GradingAccess $access,
        private GradingCatalog $catalog,
        private ClassroomGrading $grading,
        private GradingResults $results,
    ) {}

    /**
     * @throws AuthorizationException
     * @throws BusinessConflict already_closed, year_closed, no_report
     * @throws ValidationException term_id
     */
    public function handle(User $user, Classroom $classroom, string $termId, Carbon $now): TermClosure
    {
        $classroom->loadMissing(['level.cycle', 'academicYear']);
        if (! $this->access->canValidate($user, $classroom)) {
            throw new AuthorizationException;
        }
        ClassroomGrading::assertOpen($classroom);
        $settings = $classroom->level->cycle->settings;
        if ($settings->reportDocument === ReportDocument::None) {
            throw new BusinessConflict('no_report', 'Ce cycle n’a ni bulletin ni livret.');
        }
        $term = $this->grading->terms($classroom)->firstWhere('id', $termId)
            ?? throw ValidationException::withMessages(['term_id' => 'Période inconnue pour cette classe.']);

        $closure = DB::transaction(function () use ($user, $classroom, $term, $now): TermClosure {
            GradingLock::acquire('closure', $classroom->id, $term->id);
            if (TermLock::isClosed($classroom->id, $term->id)) {
                throw new BusinessConflict('already_closed', 'Les bulletins de cette période sont déjà validés.');
            }
            $students = GradingRoster::of($classroom, $term);
            $results = $this->results->compute($classroom, $term, $students, $this->catalog->subjects($classroom->academicYear, $classroom->level));
            $thresholds = MentionPolicy::thresholds($classroom->level->cycle);
            $appreciations = Appreciation::query()->where('term_id', $term->id)->whereIn('student_id', $students->modelKeys())->get()->keyBy('student_id');

            $closure = TermClosure::query()->create([
                'classroom_id' => $classroom->id,
                'term_id' => $term->id,
                'closed_at' => $now,
                'closed_by' => $user->id,
                'closed_by_name' => $user->name,
            ]);
            foreach ($students as $student) {
                // Mention figée : celle choisie par la direction, sinon celle proposée d'après la moyenne
                $appreciation = $appreciations->get($student->id) ?? new Appreciation(['term_id' => $term->id, 'student_id' => $student->id]);
                if (! $appreciation->mention_chosen) {
                    $appreciation->mention = MentionPolicy::propose($results->for($student->id)?->average, $thresholds);
                    $appreciation->mention_chosen = false;
                }
                if ($appreciation->isDirty() || ! $appreciation->exists) {
                    $appreciation->updated_by = $appreciation->exists ? $appreciation->updated_by : $user->id;
                    $appreciation->save();
                }
                ReportCard::query()->create(['term_closure_id' => $closure->id, 'student_id' => $student->id, 'status' => ReportCardStatus::Pending]);
            }

            return $closure;
        });

        RenderReportCards::dispatch($closure->school_id, $closure->id)->afterCommit();

        return $closure;
    }
}
