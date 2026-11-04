<?php

declare(strict_types=1);

use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

use function Pest\Laravel\postJson;

/**
 * @param  array<string, mixed>  $overrides
 * @return array<mixed>
 */
function newSchoolPayload(array $overrides = []): array
{
    return array_replace_recursive([
        'name' => 'École Les Flamboyants',
        'slug' => 'les-flamboyants',
        'city' => 'Bouaké',
        'cycles' => ['kindergarten', 'primary'],
        'director' => ['name' => 'Adjoua Koffi', 'phone' => '07 11 22 33 44', 'email' => 'direction@flamboyants.ci'],
    ], $overrides);
}

/** Lecture de contrôle hors RLS (connexion propriétaire des tables, réservée aux tests). */
function owner(): Connection
{
    return DB::connection('pgsql_owner');
}

it('crée l’école, ses cycles et son directeur avec un mot de passe provisoire', function (): void {
    Sanctum::actingAs(superAdmin());

    $response = postJson('/api/v1/platform/schools', newSchoolPayload())
        ->assertCreated()
        ->assertJsonPath('data.slug', 'les-flamboyants')
        ->assertJsonPath('data.city', 'Bouaké')
        ->assertJsonPath('director.phone', '+2250711223344');

    $password = $response->json('director.provisional_password');
    if (! is_string($password)) {
        throw new RuntimeException('Mot de passe provisoire absent');
    }
    expect($password)->toHaveLength(10);

    $schoolId = $response->json('data.id');
    expect(owner()->table('cycles')->where('school_id', $schoolId)->orderBy('position')->pluck('code')->all())
        ->toBe(['kindergarten', 'primary'])
        ->and(owner()->table('levels')->where('school_id', $schoolId)->count())->toBe(9);

    $director = User::on('pgsql_owner')->where('phone', '+2250711223344')->firstOrFail();
    expect($director->must_change_password)->toBeTrue()
        ->and(Hash::check($password, $director->password))->toBeTrue()
        ->and(owner()->table('role_assignments')->where(['school_id' => $schoolId, 'user_id' => $director->id, 'role' => Role::Director->value])->whereNull('cycle_id')->exists())->toBeTrue();
});

it('rattache un directeur qui a déjà un compte sans toucher à son mot de passe', function (): void {
    $existing = makeUser();
    Sanctum::actingAs(superAdmin());

    postJson('/api/v1/platform/schools', newSchoolPayload(['director' => ['phone' => $existing->phone]]))
        ->assertCreated()
        ->assertJsonPath('director.id', $existing->id)
        ->assertJsonPath('director.provisional_password', null);

    expect(owner()->table('users')->where('id', $existing->id)->value('must_change_password'))->toBeFalse();
});

it('refuse l’e-mail d’un nouveau directeur déjà porté par un autre compte (422, aucune école créée)', function (): void {
    $other = makeUser();
    Sanctum::actingAs(superAdmin());

    postJson('/api/v1/platform/schools', newSchoolPayload(['director' => ['email' => mb_strtoupper((string) $other->email)]]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['director.email']);

    expect(owner()->table('schools')->where('slug', 'les-flamboyants')->count())->toBe(0);
});

it('refuse les segments d’URL réservés (routes globales, équivalents anglais, chemins techniques)', function (string $slug): void {
    Sanctum::actingAs(superAdmin());

    postJson('/api/v1/platform/schools', newSchoolPayload(['slug' => $slug]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['slug']);

    expect(owner()->table('schools')->count())->toBe(0);
})->with(['connexion', 'etablissements', 'plateforme', 'compte', 'tableau-de-bord', 'parent', 'enseignant',
    'preinscription', 'login', 'admin', 'account', 'dashboard', 'api', 'sanctum', 'assets', 'icons', 'staging']);

it('refuse un slug déjà pris, même par une école que le super-admin ne « voit » pas en RLS', function (): void {
    makeSchool([], ['slug' => 'les-flamboyants']);
    Sanctum::actingAs(superAdmin());

    postJson('/api/v1/platform/schools', newSchoolPayload())
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['slug']);

    expect(owner()->table('schools')->where('slug', 'les-flamboyants')->count())->toBe(1);
});

it('valide les données : slug réservé ou mal formé, cycle inconnu, téléphone invalide', function (): void {
    Sanctum::actingAs(superAdmin());

    postJson('/api/v1/platform/schools', newSchoolPayload([
        'slug' => 'app',
        'cycles' => ['primary', 'lycee'],
        'director' => ['phone' => '12'],
    ]))->assertUnprocessable()->assertJsonValidationErrors(['slug', 'cycles.1', 'director.phone']);

    postJson('/api/v1/platform/schools', newSchoolPayload(['slug' => 'Les Flamboyants!']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['slug']);

    expect(owner()->table('schools')->count())->toBe(0);
});

it('n’est pas révélée aux autres utilisateurs (404), même directeur', function (): void {
    $school = makeSchool();
    $director = makeUser();
    assignRole($director, $school, Role::Director);
    Sanctum::actingAs($director);

    postJson('/api/v1/platform/schools', newSchoolPayload())->assertNotFound();
    expect(owner()->table('schools')->where('slug', 'les-flamboyants')->exists())->toBeFalse();
});

it('répond 401 sans authentification', function (): void {
    postJson('/api/v1/platform/schools', newSchoolPayload())->assertUnauthorized();
});

it('rend la main à la connexion applicative après la création', function (): void {
    Sanctum::actingAs(superAdmin());

    postJson('/api/v1/platform/schools', newSchoolPayload())->assertCreated();

    expect(DB::getDefaultConnection())->toBe('pgsql')
        ->and(DB::scalar('select current_user'))->toBe('app_user');
});
