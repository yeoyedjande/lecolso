<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Controllers;

use App\Domains\Grading\Actions\CloseTerm;
use App\Domains\Grading\Actions\ReopenTerm;
use App\Domains\Grading\Actions\RetryReportCards;
use App\Domains\Grading\Actions\SaveAppreciation;
use App\Domains\Grading\Actions\SaveMentionThresholds;
use App\Domains\Grading\Actions\ShowGradingSettings;
use App\Domains\Grading\Actions\ShowReportCards;
use App\Domains\Grading\Http\Requests\CloseTermRequest;
use App\Domains\Grading\Http\Requests\ReopenTermRequest;
use App\Domains\Grading\Http\Requests\ReportCardsRequest;
use App\Domains\Grading\Http\Requests\SaveAppreciationRequest;
use App\Domains\Grading\Http\Requests\SaveMentionThresholdsRequest;
use App\Domains\Grading\Http\Requests\SettingsYear;
use App\Domains\Grading\Http\Resources\GradingSettingsResource;
use App\Domains\Grading\Http\Resources\ReportCardsResource;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/** Bulletins : appréciations, mentions, validation et déverrouillage, rendu PDF. */
final class ReportCardController
{
    public function __construct(private ShowReportCards $show) {}

    /**
     * Bulletins d'une classe.
     *
     * Résultats, appréciations, mentions, validation et PDF pour une période (`term_id`, celle du jour par défaut).
     * 409 `no_report` si le cycle n'a ni bulletin ni livret.
     */
    public function index(ReportCardsRequest $request): ReportCardsResource
    {
        return new ReportCardsResource($this->show->handle($this->user($request), $request->classroom(), $request->optionalUuid('term_id'), Carbon::now()));
    }

    /**
     * Enregistrer les appréciations d'un élève.
     *
     * Titulaire ou direction : appréciation générale et par matière ; direction : observation et mention.
     * 409 `term_closed`, `year_closed`.
     */
    public function appreciation(SaveAppreciationRequest $request, SaveAppreciation $save): ReportCardsResource
    {
        $user = $this->user($request);
        $save->handle($user, $request->classroom(), $request->termId(), $request->studentId(), $request->appreciation());

        return new ReportCardsResource($this->show->handle($user, $request->classroom(), $request->termId(), Carbon::now()));
    }

    /**
     * Valider les bulletins.
     *
     * Direction (grades.validate) : notes, compétences et appréciations figées, bulletins PDF rendus en file d'attente.
     * 409 `already_closed`, `year_closed`, `no_report`.
     */
    public function close(CloseTermRequest $request, CloseTerm $close): ReportCardsResource
    {
        $user = $this->user($request);
        $close->handle($user, $request->classroom(), $request->termId(), Carbon::now());

        return new ReportCardsResource($this->show->handle($user, $request->classroom(), $request->termId(), Carbon::now()));
    }

    /**
     * Déverrouiller les bulletins.
     *
     * Direction (grades.validate), motif obligatoire gardé dans l'historique. 409 `not_closed`, `year_closed`.
     */
    public function reopen(ReopenTermRequest $request, ReopenTerm $reopen): ReportCardsResource
    {
        $user = $this->user($request);
        $reopen->handle($user, $request->classroom(), $request->termId(), $request->reason(), Carbon::now());

        return new ReportCardsResource($this->show->handle($user, $request->classroom(), $request->termId(), Carbon::now()));
    }

    /**
     * Relancer le rendu des bulletins en échec.
     *
     * Direction (grades.validate). 409 `not_closed`.
     */
    public function retry(CloseTermRequest $request, RetryReportCards $retry): ReportCardsResource
    {
        $user = $this->user($request);
        $retry->handle($user, $request->classroom(), $request->termId());

        return new ReportCardsResource($this->show->handle($user, $request->classroom(), $request->termId(), Carbon::now()));
    }

    /**
     * Enregistrer les seuils des mentions d'un cycle.
     *
     * Sur l'échelle du cycle ; school.settings.manage sur le cycle. Les bulletins déjà validés ne changent pas.
     */
    public function mentions(SaveMentionThresholdsRequest $request, SaveMentionThresholds $save, ShowGradingSettings $settings): GradingSettingsResource
    {
        $user = $this->user($request);
        $save->handle($user, $request->cycle(), $request->thresholds());

        return new GradingSettingsResource($settings->handle($user, $request->cycle(), SettingsYear::resolve(null, false)));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
