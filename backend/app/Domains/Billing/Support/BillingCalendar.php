<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Billing\Models\InstallmentDate;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Calendrier des échéances d'un cycle pour une année. Créé à la première lecture d'après la périodicité de facturation
 * du cycle (DefaultCalendar), et recréé si la périodicité a changé depuis (le nombre de dates ne correspond plus).
 * Ce n'est qu'un modèle : les factures déjà émises gardent leurs échéances.
 * Remplacement dans une transaction, sous verrou consultatif par année et cycle, avec relecture : deux premières
 * lectures simultanées ne suppriment pas les dates l'une de l'autre et ne créent pas deux fois la même position.
 */
final class BillingCalendar
{
    /**
     * @return Collection<int, InstallmentDate>
     */
    public function datesFor(AcademicYear $year, Cycle $cycle): Collection
    {
        $period = $cycle->settings->billingPeriod;
        $dates = $this->query($year, $cycle)->get();
        if ($dates->count() === DefaultCalendar::count($period)) {
            return $dates;
        }

        return DB::transaction(function () use ($year, $cycle, $period): Collection {
            // Aucune table lue ni écrite : simple verrou, clé propre au calendrier (identifiants UUID uniques)
            DB::select('SELECT pg_advisory_xact_lock(hashtext(?))', ['billing:calendar:'.$year->id.':'.$cycle->id]);
            $dates = $this->query($year, $cycle)->get();
            if ($dates->count() === DefaultCalendar::count($period)) {
                return $dates;
            }

            $this->query($year, $cycle)->delete();
            foreach (DefaultCalendar::for($year->starts_on, $period) as $position => $date) {
                InstallmentDate::query()->create([
                    'academic_year_id' => $year->id,
                    'cycle_id' => $cycle->id,
                    'position' => $position,
                    'due_on' => $date['due_on'],
                    'label' => $date['label'],
                ]);
            }

            return $this->query($year, $cycle)->get();
        });
    }

    /**
     * @return Builder<InstallmentDate>
     */
    private function query(AcademicYear $year, Cycle $cycle): Builder
    {
        return InstallmentDate::query()->where('academic_year_id', $year->id)->where('cycle_id', $cycle->id)->orderBy('position');
    }
}
