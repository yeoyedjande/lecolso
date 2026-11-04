<?php

declare(strict_types=1);

use App\Support\Phone\Phone;

it('normalise les saisies courantes en E.164', function (string $input, ?string $expected): void {
    expect(Phone::normalize($input))->toBe($expected);
})->with([
    ['07 01 02 03 04', '+2250701020304'],
    ['0701020304', '+2250701020304'],
    ['07.01.02.03.04', '+2250701020304'],
    ['+225 07 01 02 03 04', '+2250701020304'],
    ['00225 0701020304', '+2250701020304'],
    ['+33 6 12 34 56 78', '+33612345678'],
    ['070102', null],
    ['bonjour', null],
    ['', null],
]);

it('masque un numéro pour les logs', function (): void {
    expect(Phone::mask('+2250701020304'))->toBe('+225********04');
});
