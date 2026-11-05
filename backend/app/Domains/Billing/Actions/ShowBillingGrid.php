<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Billing\Data\BillingGrid;
use App\Domains\Billing\Models\FeeSchedule;
use App\Domains\Billing\Models\FeeType;
use App\Domains\Billing\Support\BillingCalendar;
use App\Domains\Billing\Support\BillingScope;
use App\Domains\Identity\Models\User;
use Illuminate\Database\Eloquent\Builder;

/** Grille de frais, calendriers d'échéances et inscriptions encore sans facture, pour les cycles visibles. */
final readonly class ShowBillingGrid
{
    public function __construct(
        private BillingScope $scope,
        private BillingCalendar $calendar,
    ) {}

    public function handle(User $user, AcademicYear $year): BillingGrid
    {
        $visible = $this->scope->cycles($user, 'billing.view');
        $manageable = $this->scope->cycles($user, 'billing.manage');

        $cycles = Cycle::query()
            ->when($visible !== null, static fn (Builder $query) => $query->whereIn('id', $visible ?? []))
            ->with('levels')
            ->orderBy('position')
            ->get();

        $calendars = [];
        foreach ($cycles as $cycle) {
            $calendars[$cycle->id] = $this->calendar->datesFor($year, $cycle);
        }

        return new BillingGrid(
            year: $year,
            feeTypes: FeeType::query()->orderBy('position')->get(),
            cycles: $cycles,
            amounts: FeeSchedule::query()->where('academic_year_id', $year->id)->get(),
            calendars: $calendars,
            manageableCycles: $manageable,
            pendingInvoices: $manageable === [] ? 0 : GenerateInvoices::pending($year, $manageable)->count(),
        );
    }
}
