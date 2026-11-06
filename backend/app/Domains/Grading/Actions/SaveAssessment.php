<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Models\Grade;
use App\Domains\Grading\Support\ClassroomGrading;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\GradingCatalog;
use App\Domains\Grading\Support\TermLock;
use App\Domains\Identity\Models\User;
use App\Support\Cycles\Enums\AssessmentMode;
use App\Support\Http\BusinessConflict;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Crée ou modifie une évaluation d'une classe : matière du niveau, période du cycle, date dans la période, barème
 * de 1 à 100 (jamais sous une note déjà saisie). Titulaire ou direction (grades.manage). L'identifiant peut venir de
 * l'appareil (saisie hors connexion) : une évaluation déjà créée avec cet identifiant est mise à jour.
 */
final readonly class SaveAssessment
{
    public function __construct(
        private GradingAccess $access,
        private GradingCatalog $catalog,
        private ClassroomGrading $grading,
    ) {}

    /**
     * @param  array{subject_id: string, term_id: string, title: string, date: string, out_of: int}  $data
     *
     * @throws AuthorizationException
     * @throws BusinessConflict wrong_mode, year_closed, term_closed
     * @throws ValidationException subject_id, term_id, date, out_of
     */
    public function handle(User $user, Classroom $classroom, array $data, ?Assessment $assessment = null, ?string $id = null): Assessment
    {
        $classroom->loadMissing(['level.cycle', 'academicYear']);
        if (! $this->access->canManage($user, $classroom)) {
            throw new AuthorizationException;
        }
        if ($classroom->level->cycle->settings->assessmentMode !== AssessmentMode::WeightedAverage) {
            throw new BusinessConflict('wrong_mode', 'Ce cycle n’est pas noté par matières.');
        }
        ClassroomGrading::assertOpen($classroom);

        if ($assessment === null && $id !== null) {
            $assessment = Assessment::query()->find($id);
            if ($assessment !== null && $assessment->classroom_id !== $classroom->id) {
                throw ValidationException::withMessages(['id' => 'Identifiant déjà utilisé.']);
            }
        }

        if (! $this->catalog->subjects($classroom->academicYear, $classroom->level)->contains('id', $data['subject_id'])) {
            throw ValidationException::withMessages(['subject_id' => 'Matière inconnue pour cette classe.']);
        }
        $term = $this->grading->terms($classroom)->firstWhere('id', $data['term_id'])
            ?? throw ValidationException::withMessages(['term_id' => 'Période inconnue pour cette classe.']);
        TermLock::assertOpen($classroom->id, $term->id);
        if ($assessment !== null && $assessment->exists && $assessment->term_id !== $term->id) {
            TermLock::assertOpen($classroom->id, $assessment->term_id);
        }
        if ($data['date'] < $term->starts_on->toDateString() || $data['date'] > $term->ends_on->toDateString()) {
            throw ValidationException::withMessages(['date' => 'La date doit être dans la période choisie.']);
        }
        if ($assessment !== null) {
            $highest = Grade::query()->where('assessment_id', $assessment->id)->max('value');
            if (is_numeric($highest) && (float) $highest > $data['out_of']) {
                throw ValidationException::withMessages(['out_of' => 'Une note saisie dépasse ce barème.']);
            }
        }

        $assessment ??= new Assessment(['id' => $id, 'classroom_id' => $classroom->id, 'created_by' => $user->id]);
        $previousTerm = $assessment->exists ? $assessment->term_id : null;

        return DB::transaction(static function () use ($classroom, $assessment, $data, $previousTerm): Assessment {
            TermLock::guard($classroom->id, $data['term_id']);
            if ($previousTerm !== null && $previousTerm !== $data['term_id']) {
                TermLock::guard($classroom->id, $previousTerm);
            }
            $assessment->fill([
                'subject_id' => $data['subject_id'],
                'term_id' => $data['term_id'],
                'title' => $data['title'],
                'date' => $data['date'],
                'out_of' => $data['out_of'],
            ])->save();

            return $assessment;
        });
    }

    /**
     * @throws AuthorizationException
     * @throws BusinessConflict year_closed
     */
    public function delete(User $user, Assessment $assessment): void
    {
        $classroom = $assessment->classroom()->with(['level.cycle', 'academicYear'])->firstOrFail();
        if (! $this->access->canManage($user, $classroom)) {
            throw new AuthorizationException;
        }
        ClassroomGrading::assertOpen($classroom);
        TermLock::assertOpen($classroom->id, $assessment->term_id);
        // Les notes partent avec l'évaluation (clé étrangère en cascade)
        DB::transaction(static function () use ($classroom, $assessment): void {
            TermLock::guard($classroom->id, $assessment->term_id);
            $assessment->delete();
        });
    }
}
