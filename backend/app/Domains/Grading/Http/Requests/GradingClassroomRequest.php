<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use LogicException;

/** Notes d'une classe : 404 si l'utilisateur ne voit pas la classe (titulaire ou personnel du cycle). */
abstract class GradingClassroomRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user instanceof User || ! app(GradingAccess::class)->canView($user, $this->classroom()->loadMissing(['level.cycle', 'academicYear']))) {
            throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
        }

        return true;
    }

    public function classroom(): Classroom
    {
        $classroom = $this->route('classroom');

        return $classroom instanceof Classroom ? $classroom : throw new LogicException('Classe de la route introuvable.');
    }

    public function optionalUuid(string $key): ?string
    {
        return $this->filled($key) ? $this->string($key)->toString() : null;
    }
}
