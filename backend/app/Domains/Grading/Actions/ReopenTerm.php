<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Models\Appreciation;
use App\Domains\Grading\Models\TermClosure;
use App\Domains\Grading\Support\ClassroomGrading;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\GradingLock;
use App\Domains\Grading\Support\GradingRoster;
use App\Domains\Grading\Support\TermLock;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Déverrouillage d'une période validée par la direction (grades.validate), motif obligatoire, gardé dans l'historique.
 * Les bulletins déjà rendus restent dans l'historique ; les mentions proposées seront recalculées à la prochaine
 * validation. 409 not_closed, year_closed.
 */
final readonly class ReopenTerm
{
    public function __construct(private GradingAccess $access) {}

    /**
     * @throws AuthorizationException
     * @throws BusinessConflict not_closed, year_closed
     * @throws ValidationException reason
     */
    public function handle(User $user, Classroom $classroom, string $termId, string $reason, Carbon $now): TermClosure
    {
        $classroom->loadMissing(['level.cycle', 'academicYear']);
        if (! $this->access->canValidate($user, $classroom)) {
            throw new AuthorizationException;
        }
        ClassroomGrading::assertOpen($classroom);
        if (mb_strlen($reason) < 3) {
            throw ValidationException::withMessages(['reason' => 'Indiquez le motif du déverrouillage.']);
        }

        return DB::transaction(function () use ($user, $classroom, $termId, $reason, $now): TermClosure {
            GradingLock::acquire('closure', $classroom->id, $termId);
            $closure = TermLock::closure($classroom->id, $termId)
                ?? throw new BusinessConflict('not_closed', 'Les bulletins de cette période ne sont pas validés.');
            $closure->fill([
                'reopened_at' => $now,
                'reopened_by' => $user->id,
                'reopened_by_name' => $user->name,
                'reopen_reason' => $reason,
            ])->save();
            // Mentions proposées des élèves de cette classe : recalculées à la prochaine validation
            $students = GradingRoster::of($classroom, $closure->term()->firstOrFail())->modelKeys();
            Appreciation::query()->where('term_id', $termId)->whereIn('student_id', $students)->where('mention_chosen', false)->update(['mention' => null]);

            return $closure;
        });
    }
}
