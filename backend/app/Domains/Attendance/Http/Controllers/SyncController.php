<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Controllers;

use App\Domains\Attendance\Actions\ApplySyncOperations;
use App\Domains\Attendance\Http\Requests\SyncRequest;
use App\Domains\Attendance\Http\Resources\SyncResultResource;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

/** File hors connexion de l'application (appel, garderie). */
final class SyncController
{
    /**
     * Synchroniser les saisies hors connexion.
     *
     * Opérations `attendance.roll_call`, `daycare.check`, `daycare.log`, chacune avec l'UUID de l'appareil et
     * `recorded_at` (heure de saisie). Résultat par opération : applied ou rejected ; une opération déjà traitée
     * renvoie son premier résultat (`replayed`).
     */
    public function __invoke(SyncRequest $request, ApplySyncOperations $apply): AnonymousResourceCollection
    {
        $user = $request->user();

        return SyncResultResource::collection($apply->handle($user instanceof User ? $user : throw new AuthenticationException, $request->operations(), Carbon::now()));
    }
}
