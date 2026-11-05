<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Students\Models\Guardian;
use App\Domains\Students\Models\GuardianLink;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use LogicException;

/** Tuteur de la route (`{guardian}`), lié à l'élève de la route (sinon 404). */
trait GuardianLinkRequest
{
    public function link(): GuardianLink
    {
        $guardian = $this->route('guardian');

        if (! $guardian instanceof Guardian) {
            throw new LogicException('Tuteur de la route introuvable.');
        }

        return GuardianLink::query()
            ->with('guardian')
            ->where('student_id', $this->student()->id)
            ->where('guardian_id', $guardian->id)
            ->first()
            ?? throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
    }
}
