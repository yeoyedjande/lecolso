<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Grading\Models\Term;
use App\Domains\Grading\Models\TermClosure;
use App\Domains\Grading\Support\DefaultTerms;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\GradingCatalog;
use App\Domains\Grading\Support\GradingLock;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Périodes d'un cycle pour une année : autant que le veut term_type (3 trimestres, 2 semestres, 1 période libre),
 * libellé et dates modifiables, dans l'année, à la suite et sans chevauchement.
 */
final readonly class SaveTerms
{
    public function __construct(
        private GradingAccess $access,
        private GradingCatalog $catalog,
    ) {}

    /**
     * @param  list<array{label: string, starts_on: string, ends_on: string}>  $terms
     *
     * @throws AuthorizationException
     * @throws BusinessConflict year_closed, term_closed
     * @throws ValidationException terms
     */
    public function handle(User $user, Cycle $cycle, AcademicYear $year, array $terms): void
    {
        if (! $this->access->canConfigure($user, $cycle->id)) {
            throw new AuthorizationException;
        }
        if ($year->status === AcademicYearStatus::Closed) {
            throw new BusinessConflict('year_closed', 'Cette année scolaire est clôturée.');
        }
        $expected = DefaultTerms::count($cycle->settings->termType);
        if (count($terms) !== $expected) {
            throw ValidationException::withMessages(['terms' => "Ce cycle compte {$expected} période(s)."]);
        }

        $previous = null;
        foreach ($terms as $index => $term) {
            if ($term['ends_on'] < $term['starts_on']) {
                throw ValidationException::withMessages(["terms.{$index}.ends_on" => 'La fin précède le début.']);
            }
            if ($term['starts_on'] < $year->starts_on->toDateString() || $term['ends_on'] > $year->ends_on->toDateString()) {
                throw ValidationException::withMessages(["terms.{$index}.starts_on" => 'Période hors de l’année scolaire.']);
            }
            if ($previous !== null && $term['starts_on'] <= $previous) {
                throw ValidationException::withMessages(["terms.{$index}.starts_on" => 'Les périodes doivent se suivre sans se chevaucher.']);
            }
            $previous = $term['ends_on'];
        }

        $this->catalog->terms($year, $cycle);
        DB::transaction(function () use ($year, $cycle, $terms): void {
            GradingLock::acquire('terms', $year->id, $cycle->id);
            $existing = Term::query()->where('academic_year_id', $year->id)->where('cycle_id', $cycle->id)->get()->keyBy('position');
            // Dates d'une période validée figées (élèves de la période, absences du bulletin)
            foreach ($terms as $index => $data) {
                $term = $existing->get($index + 1);
                if ($term instanceof Term && ($term->starts_on->toDateString() !== $data['starts_on'] || $term->ends_on->toDateString() !== $data['ends_on'])
                    && TermClosure::query()->where('term_id', $term->id)->whereNull('reopened_at')->exists()) {
                    throw new BusinessConflict('term_closed', 'Des bulletins de « '.$term->label.' » sont validés : la direction doit d’abord les déverrouiller.');
                }
            }
            foreach ($terms as $index => $data) {
                $term = $existing->get($index + 1) ?? new Term(['academic_year_id' => $year->id, 'cycle_id' => $cycle->id, 'position' => $index + 1]);
                $term->fill(['label' => $data['label'], 'starts_on' => $data['starts_on'], 'ends_on' => $data['ends_on']])->save();
            }
        });
    }
}
