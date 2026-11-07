<?php

declare(strict_types=1);

use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;

it('renvoie la page publique d’une école sans authentification', function (): void {
    makeSchool(['kindergarten', 'primary'], ['slug' => 'les-lauriers', 'name' => 'Les Lauriers', 'city' => 'Abidjan']);

    getJson('/api/v1/public/schools/les-lauriers')
        ->assertOk()
        ->assertExactJson([
            'data' => [
                'name' => 'Les Lauriers',
                'slug' => 'les-lauriers',
                'city' => 'Abidjan',
                'type' => 'preschool_primary',
                'address' => null,
                'phone' => null,
                'email' => null,
                'motto' => null,
                'logo_url' => null,
                'cycles' => [
                    ['code' => 'kindergarten', 'name' => 'Maternelle', 'levels' => [['code' => 'PS', 'name' => 'Petite section'], ['code' => 'MS', 'name' => 'Moyenne section'], ['code' => 'GS', 'name' => 'Grande section']]],
                    ['code' => 'primary', 'name' => 'Primaire', 'levels' => array_map(static fn (string $code): array => ['code' => $code, 'name' => $code], ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'])],
                ],
            ],
        ]);
});

it('ne révèle ni identifiant ni donnée personnelle', function (): void {
    $school = makeSchool(['primary'], ['slug' => 'les-lauriers']);

    $json = getJson('/api/v1/public/schools/les-lauriers')->assertOk()->getContent();

    // Les clés exactes sont vérifiées par le test précédent (assertExactJson)
    expect($json)->not->toContain($school->id)
        ->and($json)->not->toContain('"id"');
});

it('répond 404 pour un slug inconnu ou une école supprimée', function (): void {
    makeSchool([], ['slug' => 'fermee', 'deleted_at' => now()]);

    getJson('/api/v1/public/schools/inconnue')->assertNotFound();
    getJson('/api/v1/public/schools/fermee')->assertNotFound();
});

it('n’ouvre pas la RLS : sans contexte, la connexion applicative ne voit toujours aucune école', function (): void {
    makeSchool([], ['slug' => 'les-lauriers']);

    getJson('/api/v1/public/schools/les-lauriers')->assertOk();

    expect(DB::scalar('select count(*) from schools'))->toBe(0)
        ->and(DB::scalar('select count(*) from cycles'))->toBe(0);
});
