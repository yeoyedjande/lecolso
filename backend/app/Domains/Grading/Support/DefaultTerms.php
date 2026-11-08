<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use App\Support\Cycles\Enums\TermType;
use Carbon\CarbonImmutable;

/**
 * Périodes proposées pour une année (modifiables ensuite par la direction) :
 * - trimestres : rentrée → 22 décembre, 5 janvier → 31 mars, 1er avril → fin d'année ;
 * - semestres : rentrée → 31 janvier, 1er février → fin d'année ;
 * - période libre : toute l'année.
 * Si l'année ne permet pas ces dates (année courte ou décalée), elle est partagée en parts égales.
 */
final class DefaultTerms
{
    public static function count(TermType $type): int
    {
        return match ($type) {
            TermType::Trimester => 3,
            TermType::Semester => 2,
            TermType::FreePeriod => 1,
        };
    }

    /**
     * @return list<array{position: int, label: string, starts_on: string, ends_on: string}>
     */
    public static function for(TermType $type, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $year = $start->year;
        $bounds = match ($type) {
            TermType::Trimester => [
                [$start, $start->setDate($year, 12, 22)],
                [$start->setDate($year + 1, 1, 5), $start->setDate($year + 1, 3, 31)],
                [$start->setDate($year + 1, 4, 1), $end],
            ],
            TermType::Semester => [
                [$start, $start->setDate($year + 1, 1, 31)],
                [$start->setDate($year + 1, 2, 1), $end],
            ],
            TermType::FreePeriod => [[$start, $end]],
        };

        if (! self::fits($bounds, $start, $end)) {
            $bounds = self::split($start, $end, self::count($type));
        }

        $terms = [];
        foreach ($bounds as $index => [$from, $to]) {
            $terms[] = [
                'position' => $index + 1,
                'label' => self::label($type, $index + 1),
                'starts_on' => $from->toDateString(),
                'ends_on' => $to->toDateString(),
            ];
        }

        return $terms;
    }

    public static function label(TermType $type, int $position): string
    {
        $ordinal = $position === 1 ? '1er' : $position.'e';

        return match ($type) {
            TermType::Trimester => $ordinal.' trimestre',
            TermType::Semester => $ordinal.' semestre',
            TermType::FreePeriod => $position === 1 ? 'Année' : 'Période '.$position,
        };
    }

    /**
     * @param  list<array{0: CarbonImmutable, 1: CarbonImmutable}>  $bounds
     */
    private static function fits(array $bounds, CarbonImmutable $start, CarbonImmutable $end): bool
    {
        $previous = null;
        foreach ($bounds as [$from, $to]) {
            if ($from->gt($to) || $from->lt($start) || $to->gt($end) || ($previous !== null && $from->lte($previous))) {
                return false;
            }
            $previous = $to;
        }

        return true;
    }

    /**
     * @return list<array{0: CarbonImmutable, 1: CarbonImmutable}>
     */
    private static function split(CarbonImmutable $start, CarbonImmutable $end, int $count): array
    {
        $days = max(1, (int) $start->diffInDays($end) + 1);
        $count = min($count, $days);
        $bounds = [];
        $from = $start;
        for ($index = 1; $index <= $count; $index++) {
            $to = $index === $count ? $end : $start->addDays(intdiv($days * $index, $count) - 1);
            $bounds[] = [$from, $to];
            $from = $to->addDay();
        }

        return $bounds;
    }
}
