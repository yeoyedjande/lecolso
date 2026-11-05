<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Requests;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use LogicException;

/** Présences d'une classe : 404 si l'utilisateur ne voit pas la classe (titulaire ou personnel du cycle). */
abstract class ClassroomAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user instanceof User || ! app(AttendanceAccess::class)->canView($user, $this->classroom()->loadMissing('level.cycle'))) {
            throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
        }

        return true;
    }

    public function classroom(): Classroom
    {
        $classroom = $this->route('classroom');

        return $classroom instanceof Classroom ? $classroom : throw new LogicException('Classe de la route introuvable.');
    }

    /** Jour de la route (AAAA-MM-JJ, contrôlé par la route). */
    public function day(): string
    {
        $day = $this->route('date');

        return is_string($day) ? $day : throw new LogicException('Jour de la route introuvable.');
    }
}
