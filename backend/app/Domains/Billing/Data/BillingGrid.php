<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Billing\Models\FeeSchedule;
use App\Domains\Billing\Models\FeeType;
use App\Domains\Billing\Models\InstallmentDate;
use Illuminate\Support\Collection;

/** Grille de frais d'une année telle que l'utilisateur peut la voir (cycles de son périmètre). */
final readonly class BillingGrid
{
    /**
     * @param  Collection<int, FeeType>  $feeTypes
     * @param  Collection<int, Cycle>  $cycles  avec leurs niveaux
     * @param  Collection<int, FeeSchedule>  $amounts
     * @param  array<string, Collection<int, InstallmentDate>>  $calendars  par cycle
     * @param  list<string>|null  $manageableCycles  null = tous
     */
    public function __construct(
        public AcademicYear $year,
        public Collection $feeTypes,
        public Collection $cycles,
        public Collection $amounts,
        public array $calendars,
        public ?array $manageableCycles,
        public int $pendingInvoices,
    ) {}
}
