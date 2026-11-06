<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Controllers;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Actions\ClassHistory;
use App\Domains\Attendance\Actions\DecideJustification;
use App\Domains\Attendance\Actions\JustifyAbsence;
use App\Domains\Attendance\Actions\ListAbsences;
use App\Domains\Attendance\Actions\SaveRollCall;
use App\Domains\Attendance\Actions\ShowRollCall;
use App\Domains\Attendance\Data\AbsenceView;
use App\Domains\Attendance\Http\Requests\AbsencesRequest;
use App\Domains\Attendance\Http\Requests\ClassHistoryRequest;
use App\Domains\Attendance\Http\Requests\DecideJustificationRequest;
use App\Domains\Attendance\Http\Requests\JustifyAbsenceRequest;
use App\Domains\Attendance\Http\Requests\SaveRollCallRequest;
use App\Domains\Attendance\Http\Requests\ShowRollCallRequest;
use App\Domains\Attendance\Http\Resources\AbsenceResource;
use App\Domains\Attendance\Http\Resources\AttendanceClassroomResource;
use App\Domains\Attendance\Http\Resources\AttendanceDayResource;
use App\Domains\Attendance\Http\Resources\RollCallResource;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Identity\Models\User;
use App\Support\Time\SchoolClock;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;

/** Appels, historique, absences et justifications. */
final class AttendanceController
{
    public function __construct(
        private AttendanceAccess $access,
        private ShowRollCall $show,
    ) {}

    /**
     * Classes pour les présences.
     *
     * Classes de l'année en cours que l'utilisateur voit (titulaire, ou personnel du cycle), avec leur mode
     * (roll_call, check_in_out) et le droit de faire l'appel.
     */
    public function classrooms(Request $request): AnonymousResourceCollection
    {
        $user = $this->user($request);

        return AttendanceClassroomResource::collection($this->access->classrooms($user)->map(fn (Classroom $classroom): array => [
            'id' => $classroom->id,
            'name' => $classroom->name(),
            'cycle_id' => $classroom->level->cycle_id,
            'cycle_code' => $classroom->level->cycle->code,
            'cycle_name' => $classroom->level->cycle->name,
            'mode' => $classroom->level->cycle->settings->attendanceMode->value,
            'can_take' => $this->access->canTake($user, $classroom),
            'is_homeroom' => $classroom->homeroom_teacher_id === $user->id,
        ]));
    }

    /** Appel d'une classe pour un jour. */
    public function show(ShowRollCallRequest $request): RollCallResource
    {
        return new RollCallResource($this->show->handle($this->user($request), $request->classroom(), $request->day(), Carbon::now()));
    }

    /**
     * Enregistrer l'appel.
     *
     * Le jour même : titulaire ou personnel du cycle. Journée passée : direction (`attendance.correct`), `reason`
     * obligatoire. 409 `wrong_mode`, `year_closed`, `day_closed`.
     */
    public function save(SaveRollCallRequest $request, SaveRollCall $save): RollCallResource
    {
        $user = $this->user($request);
        $now = Carbon::now();
        $save->handle($user, $request->classroom(), $request->day(), $request->marks(), $request->reason(), $now, $request->recordedAt(), $request->rollCallId());

        return new RollCallResource($this->show->handle($user, $request->classroom()->refresh(), $request->day(), $now));
    }

    /**
     * Historique d'une classe.
     *
     * Jours ouvrés de `from` à `to` (au plus 62 jours) : appel fait, présents, absents, retards.
     */
    public function history(ClassHistoryRequest $request, ClassHistory $history): AnonymousResourceCollection
    {
        return AttendanceDayResource::collection($history->handle(
            $request->classroom(),
            $request->string('from')->toString(),
            $request->string('to')->toString(),
            Carbon::now(),
        ));
    }

    /**
     * Absences et retards.
     *
     * D'un jour (`date`, aujourd'hui par défaut) ou, avec `pending=1`, justifications à traiter (tous jours).
     */
    public function absences(AbsencesRequest $request, ListAbsences $list): AnonymousResourceCollection
    {
        $user = $this->user($request);
        $pending = $request->boolean('pending');
        $date = $pending ? null : ($request->filled('date') ? $request->string('date')->toString() : SchoolClock::date());

        return AbsenceResource::collection($list->handle($user, $date, $pending)
            ->map(fn (AttendanceMark $mark): AbsenceView => new AbsenceView($mark, $this->access->canDecide($user, $mark->rollCall->classroom))));
    }

    /**
     * Justifier une absence.
     *
     * Parent de l'enfant : motif (et photo facultative) à valider par l'école. Personnel (attendance.manage sur le
     * cycle) : justification acceptée directement. 409 `already_justified`.
     */
    public function justify(JustifyAbsenceRequest $request, JustifyAbsence $justify): AbsenceResource
    {
        $user = $this->user($request);
        $proof = $request->file('proof');
        $mark = $request->mark();
        $justify->handle($user, $mark, trim($request->string('reason')->toString()), $proof instanceof UploadedFile ? $proof : null, $request->source(), Carbon::now());

        return $this->absence($user, $mark);
    }

    /**
     * Accepter ou refuser une justification.
     *
     * Personnel avec attendance.manage sur le cycle. 409 `already_decided`.
     */
    public function decide(DecideJustificationRequest $request, DecideJustification $decide): AbsenceResource
    {
        $user = $this->user($request);
        $note = trim($request->string('note')->toString());
        $justification = $decide->handle($user, $request->justification(), $request->string('decision')->toString() === 'accepted', $note === '' ? null : $note, Carbon::now());

        return $this->absence($user, $justification->mark()->firstOrFail());
    }

    private function absence(User $user, AttendanceMark $mark): AbsenceResource
    {
        $mark->load(['student', 'justification', 'rollCall.classroom.level.cycle']);

        return new AbsenceResource(new AbsenceView($mark, $this->access->canDecide($user, $mark->rollCall->classroom)));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
