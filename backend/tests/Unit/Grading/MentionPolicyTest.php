<?php

declare(strict_types=1);

use App\Domains\Grading\Enums\Mention;
use App\Domains\Grading\Support\MentionPolicy;

it('propose la mention d’après la moyenne et les seuils', function (?float $average, ?Mention $expected): void {
    $thresholds = ['congratulations' => 8.0, 'honor_roll' => 7.0, 'encouragement' => 6.0, 'warning_below' => 4.0];

    expect(MentionPolicy::propose($average, $thresholds))->toBe($expected);
})->with([
    'félicitations' => [8.0, Mention::Congratulations],
    'tableau d’honneur' => [7.99, Mention::HonorRoll],
    'encouragements' => [6.0, Mention::Encouragement],
    'rien entre 4 et 6' => [5.5, null],
    'pile au seuil de l’avertissement' => [4.0, null],
    'avertissement' => [3.99, Mention::Warning],
    'sans moyenne' => [null, null],
]);
