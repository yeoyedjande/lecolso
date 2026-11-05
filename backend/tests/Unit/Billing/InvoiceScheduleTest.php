<?php

declare(strict_types=1);

use App\Domains\Billing\Models\InstallmentDate;
use App\Domains\Billing\Support\DefaultCalendar;
use App\Domains\Billing\Support\InvoiceSchedule;
use App\Domains\Billing\Support\Split;
use App\Support\Cycles\Enums\BillingPeriod;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * @param  list<string>  $days
 * @return Collection<int, InstallmentDate>
 */
function calendarOf(array $days): Collection
{
    return collect($days)->map(static function (string $day, int $index): InstallmentDate {
        $date = new InstallmentDate;
        $date->forceFill(['position' => $index, 'due_on' => $day, 'label' => 'Échéance '.($index + 1)]);

        return $date;
    })->values();
}

it('répartit un montant en parts entières, le reste sur la dernière', function (): void {
    expect(Split::evenly(100000, 3))->toBe([33333, 33333, 33334])
        ->and(Split::evenly(90000, 1))->toBe([90000])
        ->and(array_sum(Split::evenly(175001, 10)))->toBe(175001);
});

it('propose les échéances selon la périodicité du cycle', function (): void {
    $start = Carbon::parse('2026-09-14');

    expect(DefaultCalendar::for($start, BillingPeriod::Yearly))->toBe([['due_on' => '2026-09-14', 'label' => 'Année scolaire']])
        ->and(array_column(DefaultCalendar::for($start, BillingPeriod::Quarterly), 'due_on'))->toBe(['2026-09-14', '2027-01-05', '2027-04-05']);

    $monthly = DefaultCalendar::for($start, BillingPeriod::Monthly);
    expect($monthly)->toHaveCount(10)
        ->and($monthly[0])->toBe(['due_on' => '2026-09-14', 'label' => 'Septembre'])
        ->and($monthly[1])->toBe(['due_on' => '2026-10-05', 'label' => 'Octobre'])
        ->and($monthly[9])->toBe(['due_on' => '2027-06-05', 'label' => 'Juin']);
});

it('ne facture que les périodes restantes à une inscription en cours d’année', function (string $from, array $expected): void {
    $shares = InvoiceSchedule::remainingShares(90000, calendarOf(['2026-09-14', '2027-01-05', '2027-04-05']), Carbon::parse($from));

    expect(array_map(static fn (array $share): array => [$share['due_on'], $share['amount']], $shares))->toBe($expected);
})->with([
    'à la rentrée' => ['2026-09-14', [['2026-09-14', 30000], ['2027-01-05', 30000], ['2027-04-05', 30000]]],
    'pendant le 1er trimestre' => ['2026-11-20', [['2026-11-20', 30000], ['2027-01-05', 30000], ['2027-04-05', 30000]]],
    'le jour du 2e trimestre' => ['2027-01-05', [['2027-01-05', 30000], ['2027-04-05', 30000]]],
    'pendant le 3e trimestre' => ['2027-05-10', [['2027-05-10', 30000]]],
]);
