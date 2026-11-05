<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Billing\Models\InstallmentDate;
use Illuminate\Database\Eloquent\Collection;

/**
 * Calendrier des échéances d'un cycle pour une année. Créé à la première lecture d'après la périodicité de facturation
 * du cycle (DefaultCalendar), et recréé si la périodicité a changé depuis (le nombre de dates ne correspond plus).
 * Ce n'est qu'un modèle : les factures déjà émises gardent leurs échéances.
 */
final class BillingCalendar
{
    /**
     * @return Collection<int, InstallmentDate>
     */
    public function datesFor(AcademicYear $year, Cycle $cycle): Collection
    {
        $period = $cycle->settings->billingPeriod;
        $dates = InstallmentDate::query()
            ->where('academic_year_id', $year->id)
            ->where('cycle_id', $cycle->id)
            ->orderBy('position')
            ->get();

        if ($dates->count() === DefaultCalendar::count($period)) {
            return $dates;
        }

        InstallmentDate::query()->where('academic_year_id', $year->id)->where('cycle_id', $cycle->id)->delete();

        foreach (DefaultCalendar::for($year->starts_on, $period) as $position => $date) {
            InstallmentDate::query()->create([
                'academic_year_id' => $year->id,
                'cycle_id' => $cycle->id,
                'position' => $position,
                'due_on' => $date['due_on'],
                'label' => $date['label'],
            ]);
        }

        return InstallmentDate::query()
            ->where('academic_year_id', $year->id)
            ->where('cycle_id', $cycle->id)
            ->orderBy('position')
            ->get();
    }
}
