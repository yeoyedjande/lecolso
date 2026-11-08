<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Level;
use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Models\Subject;
use App\Domains\Grading\Models\TermClosure;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\GradingCatalog;
use App\Domains\Grading\Support\GradingLock;
use App\Domains\Identity\Models\User;
use App\Support\Cycles\Enums\AssessmentMode;
use App\Support\Http\BusinessConflict;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Matières et coefficients d'un niveau pour une année, dans l'ordre donné. Une matière absente de la liste est
 * retirée, sauf si une évaluation l'utilise (409 subject_used). Cycles en moyenne pondérée seulement.
 */
final readonly class SaveSubjects
{
    public function __construct(
        private GradingAccess $access,
        private GradingCatalog $catalog,
    ) {}

    /**
     * @param  list<array{id: string|null, name: string, coefficient: int}>  $subjects
     *
     * @throws AuthorizationException
     * @throws BusinessConflict year_closed, wrong_mode, subject_used, term_closed
     * @throws ValidationException subjects
     */
    public function handle(User $user, Level $level, AcademicYear $year, array $subjects): void
    {
        $level->loadMissing('cycle');
        if (! $this->access->canConfigure($user, $level->cycle_id)) {
            throw new AuthorizationException;
        }
        if ($year->status === AcademicYearStatus::Closed) {
            throw new BusinessConflict('year_closed', 'Cette année scolaire est clôturée.');
        }
        if ($level->cycle->settings->assessmentMode !== AssessmentMode::WeightedAverage) {
            throw new BusinessConflict('wrong_mode', 'Ce cycle n’est pas noté par matières : il est évalué par compétences.');
        }
        $names = array_map(static fn (array $subject): string => mb_strtolower($subject['name']), $subjects);
        foreach (array_diff_assoc($names, array_unique($names)) as $index => $name) {
            throw ValidationException::withMessages(["subjects.{$index}.name" => 'Cette matière figure deux fois.']);
        }

        $this->catalog->subjects($year, $level);
        DB::transaction(function () use ($level, $year, $subjects): void {
            GradingLock::acquire('subjects', $year->id, $level->id);
            // Coefficients figés par une validation en cours : ils font les moyennes et rangs des bulletins validés
            if (TermClosure::query()->whereNull('reopened_at')->whereHas('classroom', static fn (Builder $classroom) => $classroom->where('level_id', $level->id)->where('academic_year_id', $year->id))->exists()) {
                throw new BusinessConflict('term_closed', 'Des bulletins de ce niveau sont validés : la direction doit d’abord les déverrouiller.');
            }
            $existing = Subject::query()->where('academic_year_id', $year->id)->where('level_id', $level->id)->get()->keyBy('id');
            $kept = [];
            foreach ($subjects as $index => $data) {
                if ($data['id'] !== null && ! $existing->has($data['id'])) {
                    throw ValidationException::withMessages(["subjects.{$index}.id" => 'Matière inconnue pour ce niveau.']);
                }
                $subject = $data['id'] === null ? new Subject(['academic_year_id' => $year->id, 'level_id' => $level->id]) : $existing->get($data['id']);
                if (! $subject instanceof Subject) {
                    continue;
                }
                $subject->fill(['name' => $data['name'], 'coefficient' => $data['coefficient'], 'position' => $index + 1])->save();
                $kept[] = $subject->id;
            }

            $removed = array_values(array_diff(array_map(strval(...), $existing->keys()->all()), $kept));
            if ($removed !== [] && Assessment::query()->whereIn('subject_id', $removed)->exists()) {
                throw new BusinessConflict('subject_used', 'Une matière retirée a déjà des évaluations : gardez-la ou supprimez ses évaluations.');
            }
            Subject::query()->whereKey($removed)->delete();
        });
    }
}
