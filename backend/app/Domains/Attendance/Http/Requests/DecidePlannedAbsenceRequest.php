<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Requests;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Models\PlannedAbsence;
use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Support\CurrentClassroom;
use App\Support\Time\SchoolClock;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use LogicException;

/**
 * Décision sur une absence annoncée (personnel avec attendance.manage sur le cycle de la classe de l'enfant) :
 * `decision` accepted ou refused, `note` facultative. Absence que l'utilisateur ne voit pas : 404.
 */
final class DecidePlannedAbsenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $classroom = $this->classroom();
        $access = app(AttendanceAccess::class);
        if (! $user instanceof User || ! $classroom instanceof Classroom || ! $access->canView($user, $classroom)) {
            throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
        }

        return $access->canDecide($user, $classroom);
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'decision' => ['required', 'in:accepted,refused'],
            'note' => ['nullable', 'string', 'max:200'],
        ];
    }

    public function planned(): PlannedAbsence
    {
        $planned = $this->route('plannedAbsence');

        return $planned instanceof PlannedAbsence ? $planned : throw new LogicException('Absence annoncée de la route introuvable.');
    }

    public function classroom(): ?Classroom
    {
        $planned = $this->planned();

        return CurrentClassroom::of($planned->student_id, SchoolClock::date())
            ?? CurrentClassroom::of($planned->student_id, $planned->starts_on->toDateString());
    }
}
