<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Support\Cycles\Enums\BillingPeriod;
use Illuminate\Support\Carbon;

/**
 * Échéances proposées pour une année selon la périodicité de facturation du cycle (modifiables par l'école) :
 * annuelle, la rentrée ; trimestrielle, la rentrée, le 5 janvier et le 5 avril ; mensuelle, la rentrée puis le 5
 * de chaque mois jusqu'à dix échéances (septembre à juin).
 */
final class DefaultCalendar
{
    private const array MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

    public static function count(BillingPeriod $period): int
    {
        return match ($period) {
            BillingPeriod::Yearly => 1,
            BillingPeriod::Quarterly => 3,
            BillingPeriod::Monthly => 10,
        };
    }

    /**
     * @return list<array{due_on: string, label: string}>
     */
    public static function for(Carbon $startsOn, BillingPeriod $period): array
    {
        $start = $startsOn->copy()->startOfDay();

        return match ($period) {
            BillingPeriod::Yearly => [['due_on' => $start->toDateString(), 'label' => 'Année scolaire']],
            BillingPeriod::Quarterly => [
                ['due_on' => $start->toDateString(), 'label' => '1er trimestre'],
                ['due_on' => Carbon::create($start->year + 1, 1, 5)?->toDateString() ?? $start->toDateString(), 'label' => '2e trimestre'],
                ['due_on' => Carbon::create($start->year + 1, 4, 5)?->toDateString() ?? $start->toDateString(), 'label' => '3e trimestre'],
            ],
            BillingPeriod::Monthly => array_map(
                static function (int $index) use ($start): array {
                    $date = $index === 0 ? $start->copy() : $start->copy()->startOfMonth()->addMonthsNoOverflow($index)->setDay(5);

                    return ['due_on' => $date->toDateString(), 'label' => ucfirst(self::MONTHS[$date->month - 1])];
                },
                range(0, self::count($period) - 1),
            ),
        };
    }
}
