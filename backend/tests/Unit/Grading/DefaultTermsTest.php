<?php

declare(strict_types=1);

use App\Domains\Grading\Support\DefaultTerms;
use App\Support\Cycles\Enums\TermType;
use Carbon\CarbonImmutable;

it('propose trois trimestres autour des congés de Noël et de Pâques', function (): void {
    expect(DefaultTerms::for(TermType::Trimester, CarbonImmutable::parse('2026-09-14'), CarbonImmutable::parse('2027-07-02')))->toBe([
        ['position' => 1, 'label' => '1er trimestre', 'starts_on' => '2026-09-14', 'ends_on' => '2026-12-22'],
        ['position' => 2, 'label' => '2e trimestre', 'starts_on' => '2027-01-05', 'ends_on' => '2027-03-31'],
        ['position' => 3, 'label' => '3e trimestre', 'starts_on' => '2027-04-01', 'ends_on' => '2027-07-02'],
    ]);
});

it('propose deux semestres ou une période sur toute l’année', function (): void {
    $start = CarbonImmutable::parse('2026-09-14');
    $end = CarbonImmutable::parse('2027-07-02');

    expect(DefaultTerms::for(TermType::Semester, $start, $end))->toBe([
        ['position' => 1, 'label' => '1er semestre', 'starts_on' => '2026-09-14', 'ends_on' => '2027-01-31'],
        ['position' => 2, 'label' => '2e semestre', 'starts_on' => '2027-02-01', 'ends_on' => '2027-07-02'],
    ])->and(DefaultTerms::for(TermType::FreePeriod, $start, $end))->toBe([
        ['position' => 1, 'label' => 'Année', 'starts_on' => '2026-09-14', 'ends_on' => '2027-07-02'],
    ]);
});

it('partage en parts égales une année qui ne suit pas le calendrier habituel', function (): void {
    expect(DefaultTerms::for(TermType::Trimester, CarbonImmutable::parse('2027-01-04'), CarbonImmutable::parse('2027-03-31')))->toBe([
        ['position' => 1, 'label' => '1er trimestre', 'starts_on' => '2027-01-04', 'ends_on' => '2027-02-01'],
        ['position' => 2, 'label' => '2e trimestre', 'starts_on' => '2027-02-02', 'ends_on' => '2027-03-02'],
        ['position' => 3, 'label' => '3e trimestre', 'starts_on' => '2027-03-03', 'ends_on' => '2027-03-31'],
    ]);
});
