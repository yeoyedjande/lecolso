<?php

declare(strict_types=1);

use App\Domains\Tenancy\Support\SchoolCode;
use App\Support\Sequences\Sequence;

it('propose un préfixe de matricule d’après l’adresse de l’école', function (string $slug, string $code): void {
    expect(SchoolCode::suggest($slug))->toBe($code)->toMatch(SchoolCode::PATTERN);
})->with([
    ['les-lauriers', 'LAU'],
    ['groupe-scolaire-saint-viateur', 'SAI'],
    ['ecole-les-etoiles', 'ETO'],
    ['petits-genies', 'PET'],
    ['l-a', 'ECO'],
]);

it('ne prend un numéro que dans une transaction', function (): void {
    expect(static fn (): int => app(Sequence::class)->next(Sequence::STUDENT_MATRICULE))->toThrow(LogicException::class);
});
