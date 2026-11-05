<?php

declare(strict_types=1);

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\SchoolRole;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\TenantContext;

/**
 * Permissions d'un utilisateur dans une école, telles que l'Authorizer les calcule (contexte de l'utilisateur).
 *
 * @return array<string, list<string>|null>
 */
function permissionsOf(User $user, School $school): array
{
    app(TenantContext::class)->setUser($user->id);

    return app(Authorizer::class)->permissionsFor($user, $school);
}

// --- Lecture ---------------------------------------------------------------------------------------------------

it('liste les rôles système puis les rôles personnalisés, avec leurs affectations', function (): void {
    $school = makeSchool(['primary']);
    $supervisor = customRole($school, ['students.view', 'attendance.manage']);
    assignRole(makeUser(), $school, $supervisor->id);
    assignRole(makeUser(), $school, Role::Teacher);
    actingAsRole(Role::Director, $school);

    $response = spa('GET', '/api/v1/roles', [], $school)->assertOk()->assertJsonCount(7, 'data');

    expect(array_column((array) $response->json('data'), 'key'))
        ->toBe(['promoter', 'director', 'secretary', 'accountant', 'teacher', 'guardian', $supervisor->id]);

    $response->assertJsonPath('data.1.is_system', true)
        ->assertJsonPath('data.1.is_editable', false)
        ->assertJsonPath('data.1.name', null)
        ->assertJsonPath('data.1.assignments_count', 1)
        ->assertJsonPath('data.2.is_editable', true)
        ->assertJsonPath('data.4.assignments_count', 1)
        ->assertJsonPath('data.6.name', 'Surveillant général')
        ->assertJsonPath('data.6.is_system', false)
        ->assertJsonPath('data.6.permissions', ['students.view', 'attendance.manage'])
        ->assertJsonPath('data.6.assignments_count', 1);
});

it('donne le catalogue des permissions, groupées, sans celles des parents pour le personnel', function (): void {
    $school = makeSchool();
    actingAsRole(Role::Director, $school);

    $permissions = collect((array) spa('GET', '/api/v1/permissions', [], $school)->assertOk()->json('data'))
        ->keyBy('key');

    expect($permissions->get('users.manage'))->toBe(['key' => 'users.manage', 'group' => 'users', 'staff_assignable' => true])
        ->and($permissions->get('billing.pay'))->toBe(['key' => 'billing.pay', 'group' => 'billing', 'staff_assignable' => false])
        ->and($permissions->get('roles.manage'))->toBe(['key' => 'roles.manage', 'group' => 'roles', 'staff_assignable' => true]);
});

it('refuse la liste des rôles à qui ne gère ni les rôles ni les utilisateurs', function (Role $role): void {
    $school = makeSchool();
    actingAsRole($role, $school);

    spa('GET', '/api/v1/roles', [], $school)->assertForbidden();
    spa('GET', '/api/v1/permissions', [], $school)->assertForbidden();
})->with([Role::Accountant, Role::Teacher, Role::Guardian]);

// --- Création --------------------------------------------------------------------------------------------------

it('crée un rôle personnalisé qui donne ses permissions à qui le reçoit', function (): void {
    $school = makeSchool(['primary']);
    actingAsRole(Role::Director, $school);

    $created = spa('POST', '/api/v1/roles', [
        'name' => '  Surveillant général ',
        'description' => 'Présences et discipline',
        'permissions' => ['attendance.manage', 'students.view', 'attendance.view'],
    ], $school)
        ->assertCreated()
        ->assertJsonPath('data.name', 'Surveillant général')
        ->assertJsonPath('data.is_system', false)
        // Ordre du catalogue, quel que soit l'ordre envoyé
        ->assertJsonPath('data.permissions', ['students.view', 'attendance.view', 'attendance.manage'])
        ->assertJsonPath('data.assignments_count', 0);

    $key = $created->json('data.key');
    \assert(is_string($key));
    $supervisor = makeUser();
    assignRole($supervisor, $school, $key);

    expect(permissionsOf($supervisor, $school))->toBe([
        'students.view' => null,
        'attendance.view' => null,
        'attendance.manage' => null,
    ]);
});

it('limite un rôle personnalisé au cycle de l’affectation', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    $kindergarten = cycleOf($school, 'kindergarten');
    $role = customRole($school, ['attendance.manage']);
    $user = makeUser();
    assignRole($user, $school, $role->id, $kindergarten);

    app(TenantContext::class)->setUser($user->id);
    $authorizer = app(Authorizer::class);

    expect($authorizer->allows($user, 'attendance.manage', $school, $kindergarten))->toBeTrue()
        ->and($authorizer->allows($user, 'attendance.manage', $school, cycleOf($school, 'primary')))->toBeFalse()
        ->and($authorizer->allows($user, 'attendance.manage', $school))->toBeFalse()
        ->and($authorizer->allows($user, 'billing.manage', $school, $kindergarten))->toBeFalse();
});

it('valide le rôle créé', function (array $payload, string $field): void {
    $school = makeSchool();
    customRole($school, ['students.view'], 'Surveillant');
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/roles', $payload, $school)->assertUnprocessable()->assertJsonValidationErrors([$field]);
})->with([
    'nom manquant' => [['permissions' => ['students.view']], 'name'],
    'nom déjà pris (casse ignorée)' => [['name' => 'SURVEILLANT', 'permissions' => []], 'name'],
    'permission inconnue' => [['name' => 'Caissier', 'permissions' => ['billing.delete_everything']], 'permissions.0'],
    'permission des parents' => [['name' => 'Caissier', 'permissions' => ['billing.manage', 'billing.pay']], 'permissions.1'],
    'permissions absentes' => [['name' => 'Caissier'], 'permissions'],
]);

it('refuse d’accorder une permission que l’on ne détient pas (pas d’élévation)', function (): void {
    $school = makeSchool();
    actingAsRole(Role::Director, $school);

    // subscription.pay : promoteur seulement
    spa('POST', '/api/v1/roles', ['name' => 'Trésorier', 'permissions' => ['billing.view', 'subscription.pay']], $school)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['permissions' => 'subscription.pay']);

    expect(inSchool($school, static fn (): int => SchoolRole::query()->count()))->toBe(0);
});

it('réserve la gestion des rôles à la direction et au promoteur de toute l’école', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));

    // Un rôle vaut pour toute l'école : un directeur limité à un cycle peut le consulter, pas le créer
    spa('GET', '/api/v1/roles', [], $school)->assertOk();
    spa('POST', '/api/v1/roles', ['name' => 'Surveillant', 'permissions' => []], $school)->assertForbidden();

    actingAsRole(Role::Secretary, $school);
    spa('POST', '/api/v1/roles', ['name' => 'Surveillant', 'permissions' => []], $school)->assertForbidden();

    actingAsRole(Role::Promoter, $school);
    spa('POST', '/api/v1/roles', ['name' => 'Surveillant', 'permissions' => ['subscription.pay']], $school)->assertCreated();
});

// --- Modification ----------------------------------------------------------------------------------------------

it('modifie un rôle personnalisé, avec effet immédiat pour ses utilisateurs', function (): void {
    $school = makeSchool();
    $role = customRole($school, ['students.view']);
    $user = makeUser();
    assignRole($user, $school, $role->id);
    actingAsRole(Role::Director, $school);

    spa('PATCH', "/api/v1/roles/{$role->id}", [
        'name' => 'Surveillant',
        'description' => null,
        'permissions' => ['attendance.view'],
    ], $school)
        ->assertOk()
        ->assertJsonPath('data.name', 'Surveillant')
        ->assertJsonPath('data.description', null)
        ->assertJsonPath('data.permissions', ['attendance.view'])
        ->assertJsonPath('data.assignments_count', 1);

    expect(permissionsOf($user, $school))->toBe(['attendance.view' => null]);
});

it('ajuste les permissions d’un rôle système modifiable pour cette école seulement', function (): void {
    $school = makeSchool();
    $otherSchool = makeSchool();
    $secretary = makeUser();
    assignRole($secretary, $school, Role::Secretary);
    $otherSecretary = makeUser();
    assignRole($otherSecretary, $otherSchool, Role::Secretary);
    actingAsRole(Role::Director, $school);

    spa('PATCH', '/api/v1/roles/secretary', ['permissions' => ['students.view', 'billing.view']], $school)
        ->assertOk()
        ->assertJsonPath('data.key', 'secretary')
        ->assertJsonPath('data.is_system', true)
        ->assertJsonPath('data.permissions', ['students.view', 'billing.view']);

    expect(permissionsOf($secretary, $school))->toBe(['students.view' => null, 'billing.view' => null])
        // L'autre école garde les permissions par défaut
        ->and(permissionsOf($otherSecretary, $otherSchool))->toHaveKey('students.manage');
});

it('ne laisse modifier ni un rôle système verrouillé, ni le nom d’un rôle système', function (): void {
    $school = makeSchool();
    actingAsRole(Role::Director, $school);

    foreach (['promoter', 'director', 'teacher', 'guardian'] as $locked) {
        spa('PATCH', "/api/v1/roles/{$locked}", ['permissions' => ['students.view']], $school)
            ->assertConflict()
            ->assertJsonPath('code', 'role_locked');
    }

    spa('PATCH', '/api/v1/roles/secretary', ['name' => 'Accueil'], $school)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name']);
});

it('vérifie l’élévation sur les seules permissions ajoutées', function (): void {
    $school = makeSchool();
    // Créé par le promoteur avec une permission que la direction n'a pas
    $role = customRole($school, ['billing.view', 'subscription.pay']);
    actingAsRole(Role::Director, $school);

    // La direction peut modifier le reste du rôle sans retirer ni ajouter subscription.pay…
    spa('PATCH', "/api/v1/roles/{$role->id}", ['permissions' => ['billing.view', 'billing.manage', 'subscription.pay']], $school)
        ->assertOk();
    // … mais pas ajouter une permission qu'elle n'a pas
    spa('PATCH', '/api/v1/roles/accountant', ['permissions' => ['billing.view', 'subscription.pay']], $school)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['permissions']);
});

it('répond 404 pour un rôle inconnu', function (): void {
    $school = makeSchool();
    actingAsRole(Role::Director, $school);

    spa('PATCH', '/api/v1/roles/super_admin', ['permissions' => []], $school)->assertNotFound();
    spa('PATCH', '/api/v1/roles/pas-un-uuid', ['permissions' => []], $school)->assertNotFound();
    spa('PATCH', '/api/v1/roles/'.fake()->uuid(), ['permissions' => []], $school)->assertNotFound();
});

// --- Suppression -----------------------------------------------------------------------------------------------

it('supprime un rôle personnalisé qui n’est plus attribué', function (): void {
    $school = makeSchool();
    $role = customRole($school, ['students.view']);
    actingAsRole(Role::Director, $school);

    spa('DELETE', "/api/v1/roles/{$role->id}", [], $school)->assertNoContent();

    expect(inSchool($school, static fn (): bool => SchoolRole::query()->whereKey($role->id)->exists()))->toBeFalse();
});

it('refuse de supprimer un rôle attribué ou un rôle système', function (): void {
    $school = makeSchool();
    $role = customRole($school, ['students.view']);
    assignRole(makeUser(), $school, $role->id);
    actingAsRole(Role::Director, $school);

    spa('DELETE', "/api/v1/roles/{$role->id}", [], $school)->assertConflict()->assertJsonPath('code', 'role_in_use');
    spa('DELETE', '/api/v1/roles/secretary', [], $school)->assertConflict()->assertJsonPath('code', 'role_locked');
    spa('DELETE', '/api/v1/roles/pas-un-uuid', [], $school)->assertNotFound();

    actingAsRole(Role::Secretary, $school);
    spa('DELETE', "/api/v1/roles/{$role->id}", [], $school)->assertForbidden();
});

// --- Isolation entre écoles ------------------------------------------------------------------------------------

it('isole les rôles personnalisés entre écoles (404, rien à deviner)', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();
    $roleA = customRole($schoolA, ['students.view']);
    actingAsRole(Role::Director, $schoolB);

    $keys = array_column((array) spa('GET', '/api/v1/roles', [], $schoolB)->assertOk()->json('data'), 'key');
    expect($keys)->not->toContain($roleA->id);

    spa('PATCH', "/api/v1/roles/{$roleA->id}", ['name' => 'Piraté'], $schoolB)->assertNotFound();
    spa('DELETE', "/api/v1/roles/{$roleA->id}", [], $schoolB)->assertNotFound();
    // En-tête d'une école où l'on n'a pas d'affectation : 404 (ResolveSchool)
    spa('GET', '/api/v1/roles', [], $schoolA)->assertNotFound();

    expect(inSchool($schoolA, static fn (): ?string => SchoolRole::query()->find($roleA->id)?->name))->toBe('Surveillant général');
});

it('n’affecte pas le rôle personnalisé d’une autre école', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();
    $roleA = customRole($schoolA, ['students.view']);

    expect(static fn () => assignRole(makeUser(), $schoolB, $roleA->id))
        ->toThrow(InvalidArgumentException::class, 'Rôle inconnu');
});

it('ne laisse lire en SQL brut que les rôles des écoles de l’utilisateur', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();
    $roleA = customRole($schoolA, ['students.view'], 'Rôle A');
    customRole($schoolB, ['students.view'], 'Rôle B');
    $user = makeUser();
    assignRole($user, $schoolA, Role::Teacher);

    $context = app(TenantContext::class);
    // Sans contexte : rien
    expect(rows('SELECT id FROM school_roles'))->toBe([]);

    // Hors école courante, avec l'utilisateur : uniquement les rôles de ses écoles (calcul de /me)
    $context->setUser($user->id);
    expect(distinctColumn('id', 'SELECT id FROM school_roles'))->toBe([$roleA->id]);
});

it('montre les rôles au secrétariat, qui réinitialise les mots de passe, sans les lui faire gérer', function (): void {
    $school = makeSchool();
    actingAsRole(Role::Secretary, $school);

    spa('GET', '/api/v1/roles', [], $school)->assertOk();
    spa('GET', '/api/v1/permissions', [], $school)->assertOk();
    spa('POST', '/api/v1/roles', ['name' => 'Surveillant', 'permissions' => []], $school)->assertForbidden();
});
