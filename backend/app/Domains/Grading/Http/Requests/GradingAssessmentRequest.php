<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use LogicException;

/** Évaluation de la route : 404 si l'utilisateur ne voit pas sa classe. Droit de saisie contrôlé par l'Action. */
abstract class GradingAssessmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $assessment = $this->assessment()->loadMissing(['classroom.level.cycle', 'classroom.academicYear']);
        if (! $user instanceof User || ! app(GradingAccess::class)->canView($user, $assessment->classroom)) {
            throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
        }

        return true;
    }

    public function assessment(): Assessment
    {
        $assessment = $this->route('assessment');

        return $assessment instanceof Assessment ? $assessment : throw new LogicException('Évaluation de la route introuvable.');
    }
}
