<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Models\Term;
use App\Support\Http\BusinessConflict;
use App\Support\Time\SchoolClock;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/** Périodes d'une classe (celles de son cycle pour son année) et choix de la période affichée. */
final readonly class ClassroomGrading
{
    public function __construct(private GradingCatalog $catalog) {}

    /**
     * @return Collection<int, Term>
     */
    public function terms(Classroom $classroom): Collection
    {
        $classroom->loadMissing(['level.cycle', 'academicYear']);

        return $this->catalog->terms($classroom->academicYear, $classroom->level->cycle);
    }

    /**
     * Période demandée (422 si elle n'est pas celle de la classe), sinon celle du jour, sinon la dernière commencée,
     * sinon la première.
     *
     * @param  Collection<int, Term>  $terms
     */
    public function pick(Collection $terms, ?string $termId, Carbon $now): Term
    {
        if ($termId !== null) {
            return $terms->firstWhere('id', $termId) ?? throw ValidationException::withMessages(['term_id' => 'Période inconnue pour cette classe.']);
        }
        $today = SchoolClock::date($now);
        $started = $terms->filter(static fn (Term $term): bool => $term->starts_on->toDateString() <= $today);
        $term = $started->last() ?? $terms->first();

        return $term ?? throw new BusinessConflict('no_terms', 'Aucune période n’est définie pour cette classe.');
    }

    /** 409 year_closed : notes et compétences d'une année clôturée ne changent plus. */
    public static function assertOpen(Classroom $classroom): void
    {
        if ($classroom->academicYear->status === AcademicYearStatus::Closed) {
            throw new BusinessConflict('year_closed', 'Cette année scolaire est clôturée.');
        }
    }
}
