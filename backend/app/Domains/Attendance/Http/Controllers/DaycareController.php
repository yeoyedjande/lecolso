<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Controllers;

use App\Domains\Attendance\Actions\RecordDaycare;
use App\Domains\Attendance\Actions\ShowDaycareBoard;
use App\Domains\Attendance\Enums\DaycareLogKind;
use App\Domains\Attendance\Http\Requests\DaycareBoardRequest;
use App\Domains\Attendance\Http\Requests\DaycareCheckRequest;
use App\Domains\Attendance\Http\Requests\DaycareLogRequest;
use App\Domains\Attendance\Http\Resources\DaycareBoardResource;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use App\Support\Time\SchoolClock;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/** Garderie : tableau du jour, arrivées et départs, journal. */
final class DaycareController
{
    public function __construct(private ShowDaycareBoard $board) {}

    /** Garderie d'un jour (`date`, aujourd'hui par défaut). */
    public function show(DaycareBoardRequest $request): DaycareBoardResource
    {
        $date = $request->filled('date') ? $request->string('date')->toString() : SchoolClock::date();

        return new DaycareBoardResource($this->board->handle($this->user($request), $date));
    }

    /**
     * Arrivée ou départ.
     *
     * Aujourd'hui, par qui fait l'appel de la classe de l'enfant. 409 `not_enrolled`, `wrong_mode`, `day_closed`.
     * Renvoie la garderie du jour.
     */
    public function check(DaycareCheckRequest $request, RecordDaycare $record): DaycareBoardResource
    {
        $user = $this->user($request);
        $today = SchoolClock::date();
        $person = trim($request->string('person')->toString());
        $record->check($user, $this->student($request), $today, $request->string('direction')->toString(), $request->string('time')->toString(), $person === '' ? null : $person, Carbon::now());

        return new DaycareBoardResource($this->board->handle($user, $today));
    }

    /**
     * Ajouter au journal.
     *
     * Repas, sieste, change, humeur, activité, santé. Renvoie la garderie du jour.
     */
    public function log(DaycareLogRequest $request, RecordDaycare $record): DaycareBoardResource
    {
        $user = $this->user($request);
        $today = SchoolClock::date();
        $record->log($user, $this->student($request), $today, $request->string('time')->toString(), DaycareLogKind::from($request->string('kind')->toString()), trim($request->string('note')->toString()), Carbon::now());

        return new DaycareBoardResource($this->board->handle($user, $today));
    }

    private function student(Request $request): Student
    {
        // Sous la RLS de l'école courante : un enfant d'une autre école est introuvable (404)
        return Student::query()->findOrFail($request->string('student_id')->toString());
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
