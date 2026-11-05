<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Requests;

use App\Domains\Attendance\Models\AbsenceJustification;
use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use LogicException;

/**
 * Décision sur une justification (personnel avec attendance.manage sur le cycle : direction, secrétariat) :
 * `decision` accepted ou refused, `note` facultative. Justification que l'utilisateur ne voit pas : 404.
 */
final class DecideJustificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $classroom = $this->justification()->loadMissing('mark.rollCall.classroom.level.cycle')->mark->rollCall->classroom;
        $access = app(AttendanceAccess::class);
        if (! $user instanceof User || ! $access->canView($user, $classroom)) {
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

    public function justification(): AbsenceJustification
    {
        $justification = $this->route('justification');

        return $justification instanceof AbsenceJustification ? $justification : throw new LogicException('Justification de la route introuvable.');
    }
}
