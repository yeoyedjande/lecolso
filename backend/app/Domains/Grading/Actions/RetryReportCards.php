<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Enums\ReportCardStatus;
use App\Domains\Grading\Jobs\RenderReportCards;
use App\Domains\Grading\Models\ReportCard;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\TermLock;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use Illuminate\Auth\Access\AuthorizationException;

/** Relance le rendu des bulletins en échec d'une période validée (direction). 409 not_closed. */
final readonly class RetryReportCards
{
    public function __construct(private GradingAccess $access) {}

    /**
     * @throws AuthorizationException
     * @throws BusinessConflict not_closed
     */
    public function handle(User $user, Classroom $classroom, string $termId): int
    {
        $classroom->loadMissing('level.cycle');
        if (! $this->access->canValidate($user, $classroom)) {
            throw new AuthorizationException;
        }
        $closure = TermLock::closure($classroom->id, $termId)
            ?? throw new BusinessConflict('not_closed', 'Les bulletins de cette période ne sont pas validés.');
        $count = ReportCard::query()->where('term_closure_id', $closure->id)->where('status', ReportCardStatus::Failed)
            ->update(['status' => ReportCardStatus::Pending]);
        if ($count > 0) {
            RenderReportCards::dispatch($closure->school_id, $closure->id);
        }

        return $count;
    }
}
