<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Billing\Models\InstallmentDate;
use App\Domains\Billing\Support\BillingCalendar;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Dates et libellés des échéances d'un cycle pour une année ; leur nombre suit la périodicité de facturation du cycle
 * (vérifié par la requête). Seules les factures émises ensuite les utilisent.
 */
final readonly class SaveCalendar
{
    public function __construct(private BillingCalendar $calendar) {}

    /**
     * @param  list<array{due_on: string, label: string}>  $dates
     * @return Collection<int, InstallmentDate>
     */
    public function handle(AcademicYear $year, Cycle $cycle, array $dates): Collection
    {
        return DB::transaction(function () use ($year, $cycle, $dates): Collection {
            $existing = $this->calendar->datesFor($year, $cycle);

            foreach ($existing as $index => $date) {
                $date->fill($dates[$index] ?? [])->save();
            }

            return $this->calendar->datesFor($year, $cycle);
        });
    }
}
