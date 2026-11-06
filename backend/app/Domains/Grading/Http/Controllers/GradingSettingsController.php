<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Controllers;

use App\Domains\Grading\Actions\SaveSkills;
use App\Domains\Grading\Actions\SaveSubjects;
use App\Domains\Grading\Actions\SaveTerms;
use App\Domains\Grading\Actions\ShowGradingSettings;
use App\Domains\Grading\Http\Requests\GradingSettingsRequest;
use App\Domains\Grading\Http\Requests\SaveSkillsRequest;
use App\Domains\Grading\Http\Requests\SaveSubjectsRequest;
use App\Domains\Grading\Http\Requests\SaveTermsRequest;
use App\Domains\Grading\Http\Resources\GradingSettingsResource;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;

/** Réglages des notes : périodes, matières et coefficients, référentiel de compétences. */
final class GradingSettingsController
{
    public function __construct(private ShowGradingSettings $show) {}

    /**
     * Réglages des notes d'un cycle.
     *
     * Périodes, matières par niveau (cycles en moyenne pondérée) et compétences (cycles en compétences) de l'année
     * (en cours par défaut), créées d'après les listes par défaut à la première lecture. 409 `no_current_year`.
     */
    public function show(GradingSettingsRequest $request): GradingSettingsResource
    {
        return new GradingSettingsResource($this->show->handle($this->user($request), $request->cycle(), $request->year()));
    }

    /**
     * Enregistrer les périodes d'un cycle.
     *
     * school.settings.manage sur le cycle. 409 `year_closed`.
     */
    public function terms(SaveTermsRequest $request, SaveTerms $save): GradingSettingsResource
    {
        $user = $this->user($request);
        $year = $request->year();
        $save->handle($user, $request->cycle(), $year, $request->terms());

        return new GradingSettingsResource($this->show->handle($user, $request->cycle(), $year));
    }

    /**
     * Enregistrer les matières d'un niveau.
     *
     * school.settings.manage sur le cycle. 409 `year_closed`, `wrong_mode`, `subject_used`.
     */
    public function subjects(SaveSubjectsRequest $request, SaveSubjects $save): GradingSettingsResource
    {
        $user = $this->user($request);
        $year = $request->year();
        $level = $request->level()->loadMissing('cycle');
        $save->handle($user, $level, $year, $request->subjects());

        return new GradingSettingsResource($this->show->handle($user, $level->cycle, $year));
    }

    /**
     * Enregistrer le référentiel de compétences d'un cycle.
     *
     * school.settings.manage sur le cycle. 409 `year_closed`, `wrong_mode`, `skill_used`.
     */
    public function skills(SaveSkillsRequest $request, SaveSkills $save): GradingSettingsResource
    {
        $user = $this->user($request);
        $year = $request->year();
        $save->handle($user, $request->cycle(), $year, $request->skills());

        return new GradingSettingsResource($this->show->handle($user, $request->cycle(), $year));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
