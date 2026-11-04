<?php

declare(strict_types=1);

use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\SchoolUrl;

function schoolWithSlug(string $slug): School
{
    $school = new School;
    $school->forceFill(['slug' => $slug]);

    return $school;
}

beforeEach(function (): void {
    config()->set('app.frontend_url', 'https://app.ekalewa.com/');
});

it('construit les liens par chemin sur le domaine applicatif, jamais par sous-domaine', function (): void {
    $school = schoolWithSlug('les-genies');

    expect(SchoolUrl::to($school))->toBe('https://app.ekalewa.com/les-genies')
        ->and(SchoolUrl::to($school, 'tableau-de-bord'))->toBe('https://app.ekalewa.com/les-genies/tableau-de-bord')
        ->and(SchoolUrl::to($school, '/parent/paiements/'))->toBe('https://app.ekalewa.com/les-genies/parent/paiements')
        ->and(SchoolUrl::to($school, 'eleves', ['onglet' => 'paiements', 'page' => 2]))
        ->toBe('https://app.ekalewa.com/les-genies/eleves?onglet=paiements&page=2');
});

it('suit FRONTEND_URL (staging)', function (): void {
    config()->set('app.frontend_url', 'https://staging.ekalewa.com');

    expect(SchoolUrl::to(schoolWithSlug('creche-les-anges'), 'preinscription'))
        ->toBe('https://staging.ekalewa.com/creche-les-anges/preinscription');
});

it('refuse un chemin qui sortirait de l’école', function (string $path): void {
    expect(fn (): string => SchoolUrl::to(schoolWithSlug('les-genies'), $path))->toThrow(InvalidArgumentException::class);
})->with([
    'URL absolue' => ['https://autre.example/piege'],
    'hôte relatif au protocole' => ['//autre.example'],
    'remontée' => ['../autre-ecole/eleves'],
    'remontée au milieu' => ['eleves/../../autre-ecole'],
    'caractères' => ['eleves?x=1'],
]);
