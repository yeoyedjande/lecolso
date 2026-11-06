<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Controllers;

use App\Domains\Attendance\Actions\DecidePlannedAbsence;
use App\Domains\Attendance\Actions\ListPlannedAbsences;
use App\Domains\Attendance\Data\PlannedAbsenceView;
use App\Domains\Attendance\Http\Requests\DecidePlannedAbsenceRequest;
use App\Domains\Attendance\Http\Requests\PlannedAbsencesRequest;
use App\Domains\Attendance\Http\Resources\PlannedAbsenceResource;
use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use LogicException;

final class PlannedAbsenceController
{
    /**
     * Absences annoncées par les parents.
     *
     * Dans les classes que l'utilisateur voit : en cours ou à venir, ou avec `pending=1` celles à traiter.
     */
    public function index(PlannedAbsencesRequest $request, ListPlannedAbsences $list): AnonymousResourceCollection
    {
        return PlannedAbsenceResource::collection($list->handle($this->user($request), $request->boolean('pending'), Carbon::now()));
    }

    /**
     * Accepter ou refuser une absence annoncée.
     *
     * Personnel avec attendance.manage sur le cycle. La décision vaut pour les justifications déjà rattachées aux
     * absences relevées et pour les appels à venir. 409 `already_decided`.
     */
    public function decide(DecidePlannedAbsenceRequest $request, DecidePlannedAbsence $decide, AttendanceAccess $access): PlannedAbsenceResource
    {
        $user = $this->user($request);
        $note = trim($request->string('note')->toString());
        $planned = $decide->handle($user, $request->planned(), $request->string('decision')->toString() === 'accepted', $note === '' ? null : $note, Carbon::now());
        $classroom = $request->classroom() ?? throw new LogicException('Classe introuvable.');

        return new PlannedAbsenceResource(new PlannedAbsenceView($planned->load('student'), $classroom, $access->canDecide($user, $classroom)));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
