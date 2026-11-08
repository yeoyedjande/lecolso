<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Controllers;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Actions\SaveAssessment;
use App\Domains\Grading\Actions\SaveGrades;
use App\Domains\Grading\Actions\SaveSkillEvaluations;
use App\Domains\Grading\Actions\ShowClassResults;
use App\Domains\Grading\Actions\ShowGradeGrid;
use App\Domains\Grading\Actions\ShowSkillGrid;
use App\Domains\Grading\Http\Requests\DeleteAssessmentRequest;
use App\Domains\Grading\Http\Requests\GradeGridRequest;
use App\Domains\Grading\Http\Requests\SaveGradesRequest;
use App\Domains\Grading\Http\Requests\SaveSkillEvaluationsRequest;
use App\Domains\Grading\Http\Requests\StoreAssessmentRequest;
use App\Domains\Grading\Http\Requests\TermGridRequest;
use App\Domains\Grading\Http\Requests\UpdateAssessmentRequest;
use App\Domains\Grading\Http\Resources\AssessmentResource;
use App\Domains\Grading\Http\Resources\ClassResultsResource;
use App\Domains\Grading\Http\Resources\GradeGridResource;
use App\Domains\Grading\Http\Resources\GradingClassroomResource;
use App\Domains\Grading\Http\Resources\SkillGridResource;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;

/** Évaluations, notes, compétences et résultats d'une classe. */
final class GradingController
{
    public function __construct(private GradingAccess $access) {}

    /**
     * Classes pour les notes.
     *
     * Classes de l'année en cours que l'utilisateur voit (titulaire, ou personnel du cycle), avec leur mode
     * d'évaluation (weighted_average, competency, observation), l'échelle des moyennes et le droit de saisie.
     */
    public function classrooms(Request $request): AnonymousResourceCollection
    {
        $user = $this->user($request);

        return GradingClassroomResource::collection($this->access->classrooms($user)->map(fn (Classroom $classroom): array => [
            'id' => $classroom->id,
            'name' => $classroom->name(),
            'level_id' => $classroom->level_id,
            'cycle_id' => $classroom->level->cycle_id,
            'cycle_code' => $classroom->level->cycle->code,
            'cycle_name' => $classroom->level->cycle->name,
            'mode' => $classroom->level->cycle->settings->assessmentMode->value,
            'grade_scale' => $classroom->level->cycle->settings->gradeScale->max(),
            'can_manage' => $this->access->canManage($user, $classroom),
            'is_homeroom' => $classroom->homeroom_teacher_id === $user->id,
        ]));
    }

    /**
     * Grille de notes d'une classe.
     *
     * Période (`term_id`, celle du jour par défaut) et matière (`subject_id`, la première par défaut). 409 `wrong_mode`
     * hors cycles en moyenne pondérée.
     */
    public function grid(GradeGridRequest $request, ShowGradeGrid $grid): GradeGridResource
    {
        return new GradeGridResource($grid->handle(
            $this->user($request),
            $request->classroom(),
            $request->optionalUuid('term_id'),
            $request->optionalUuid('subject_id'),
            Carbon::now(),
        ));
    }

    /**
     * Créer une évaluation.
     *
     * Titulaire ou direction (grades.manage). 409 `wrong_mode`, `year_closed`.
     */
    public function store(StoreAssessmentRequest $request, SaveAssessment $save): JsonResponse
    {
        $assessment = $save->handle($this->user($request), $request->classroom(), $request->assessmentData(), null, $request->optionalUuid('id'));

        return (new AssessmentResource($assessment))->response()->setStatusCode($assessment->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Modifier une évaluation.
     *
     * Le barème ne descend jamais sous une note déjà saisie. 409 `year_closed`.
     */
    public function update(UpdateAssessmentRequest $request, SaveAssessment $save): AssessmentResource
    {
        $assessment = $request->assessment();

        return new AssessmentResource($save->handle($this->user($request), $assessment->classroom, $request->assessmentData(), $assessment));
    }

    /**
     * Supprimer une évaluation.
     *
     * Ses notes sont supprimées avec elle. 409 `year_closed`.
     */
    public function destroy(DeleteAssessmentRequest $request, SaveAssessment $save): Response
    {
        $save->delete($this->user($request), $request->assessment());

        return response()->noContent();
    }

    /**
     * Enregistrer les notes d'une évaluation.
     *
     * Renvoie la grille de la matière et de la période de l'évaluation. 409 `year_closed`.
     */
    public function grades(SaveGradesRequest $request, SaveGrades $save, ShowGradeGrid $grid): GradeGridResource
    {
        $user = $this->user($request);
        $assessment = $request->assessment();
        $save->handle($user, $assessment, $request->grades(), $request->recordedAt());

        return new GradeGridResource($grid->handle($user, $assessment->classroom, $assessment->term_id, $assessment->subject_id, Carbon::now()));
    }

    /**
     * Résultats d'une classe.
     *
     * Moyennes, rangs, moyenne de classe (moyenne pondérée) ou bilan des compétences, pour une période (`term_id`).
     */
    public function results(TermGridRequest $request, ShowClassResults $results): ClassResultsResource
    {
        return new ClassResultsResource($results->handle($request->classroom(), $request->optionalUuid('term_id'), Carbon::now()));
    }

    /**
     * Compétences d'une classe.
     *
     * Niveau de chaque élève dans chaque compétence pour une période (`term_id`). 409 `wrong_mode`.
     */
    public function skills(TermGridRequest $request, ShowSkillGrid $grid): SkillGridResource
    {
        return new SkillGridResource($grid->handle($this->user($request), $request->classroom(), $request->optionalUuid('term_id'), Carbon::now()));
    }

    /**
     * Enregistrer les compétences d'une classe.
     *
     * Titulaire ou direction. 409 `wrong_mode`, `year_closed`.
     */
    public function saveSkills(SaveSkillEvaluationsRequest $request, SaveSkillEvaluations $save, ShowSkillGrid $grid): SkillGridResource
    {
        $user = $this->user($request);
        $save->handle($user, $request->classroom(), $request->termId(), $request->evaluations(), $request->recordedAt());

        return new SkillGridResource($grid->handle($user, $request->classroom(), $request->termId(), Carbon::now()));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
