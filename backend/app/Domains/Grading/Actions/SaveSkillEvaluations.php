<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Enums\SkillLevel;
use App\Domains\Grading\Models\SkillEvaluation;
use App\Domains\Grading\Support\ClassroomGrading;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\GradingCatalog;
use App\Domains\Grading\Support\GradingLock;
use App\Domains\Grading\Support\GradingRoster;
use App\Domains\Identity\Models\User;
use App\Support\Cycles\Enums\AssessmentMode;
use App\Support\Http\BusinessConflict;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Niveaux de compétences d'une classe pour une période : A, EA, NA, ou rien (évaluation effacée). Titulaire ou
 * direction. Saisie hors connexion (`recordedAt`) : une évaluation modifiée sur le serveur après la saisie de
 * l'appareil est gardée.
 */
final readonly class SaveSkillEvaluations
{
    public function __construct(
        private GradingAccess $access,
        private GradingCatalog $catalog,
        private ClassroomGrading $grading,
    ) {}

    /**
     * @param  list<array{student_id: string, skill_id: string, level: SkillLevel|null}>  $evaluations
     *
     * @throws AuthorizationException
     * @throws BusinessConflict wrong_mode, year_closed
     * @throws ValidationException term_id, evaluations
     */
    public function handle(User $user, Classroom $classroom, string $termId, array $evaluations, ?Carbon $recordedAt = null): void
    {
        $classroom->loadMissing(['level.cycle', 'academicYear']);
        if (! $this->access->canManage($user, $classroom)) {
            throw new AuthorizationException;
        }
        if ($classroom->level->cycle->settings->assessmentMode !== AssessmentMode::Competency) {
            throw new BusinessConflict('wrong_mode', 'Ce cycle n’est pas évalué par compétences.');
        }
        ClassroomGrading::assertOpen($classroom);
        $term = $this->grading->terms($classroom)->firstWhere('id', $termId)
            ?? throw ValidationException::withMessages(['term_id' => 'Période inconnue pour cette classe.']);
        $skills = $this->catalog->skills($classroom->academicYear, $classroom->level->cycle)->modelKeys();
        $roster = GradingRoster::of($classroom, $term)->modelKeys();
        foreach ($evaluations as $index => $evaluation) {
            if (! in_array($evaluation['student_id'], $roster, true)) {
                throw ValidationException::withMessages(["evaluations.{$index}.student_id" => 'Élève non inscrit dans cette classe pendant la période.']);
            }
            if (! in_array($evaluation['skill_id'], $skills, true)) {
                throw ValidationException::withMessages(["evaluations.{$index}.skill_id" => 'Compétence inconnue pour ce cycle.']);
            }
        }

        DB::transaction(function () use ($user, $classroom, $term, $evaluations, $recordedAt): void {
            GradingLock::acquire('skills', $term->id, $classroom->id);
            $existing = SkillEvaluation::query()
                ->where('term_id', $term->id)
                ->whereIn('student_id', array_column($evaluations, 'student_id'))
                ->get()
                ->keyBy(static fn (SkillEvaluation $evaluation): string => $evaluation->student_id.':'.$evaluation->skill_id);
            foreach ($evaluations as $data) {
                $evaluation = $existing->get($data['student_id'].':'.$data['skill_id']);
                if ($evaluation instanceof SkillEvaluation && $recordedAt !== null && $evaluation->updated_at !== null && $evaluation->updated_at->gt($recordedAt)) {
                    continue;
                }
                if ($data['level'] === null) {
                    $evaluation?->delete();

                    continue;
                }
                $evaluation ??= new SkillEvaluation(['term_id' => $term->id, 'student_id' => $data['student_id'], 'skill_id' => $data['skill_id']]);
                $evaluation->fill(['level' => $data['level'], 'entered_by' => $user->id]);
                if ($recordedAt !== null) {
                    // Datée de sa saisie sur l'appareil (jamais dans le futur) : la plus récente gagne
                    $evaluation->updated_at = $recordedAt->min(Carbon::now());
                }
                $evaluation->save();
            }
        });
    }
}
