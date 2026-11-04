<?php

declare(strict_types=1);

use App\Domains\Identity\Enums\Role;

it('renvoie le profil, les écoles, les rôles par cycle et les permissions', function (): void {
    $schoolA = makeSchool(null, ['name' => 'A — Les Lauriers']);
    $schoolB = makeSchool(null, ['name' => 'B — Petits Génies']);
    makeSchool(null, ['name' => 'C — Sans lien']);
    $kindergarten = cycleOf($schoolA, 'kindergarten');

    $user = makeUser();
    assignRole($user, $schoolA, Role::Director, $kindergarten);
    assignRole($user, $schoolB, Role::Accountant);
    login($user)->assertOk();

    $me = spa('GET', '/api/v1/me')->assertOk();

    $me->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.must_change_password', false)
        ->assertJsonPath('data.is_super_admin', false)
        ->assertJsonCount(2, 'data.schools')
        ->assertJsonPath('data.schools.0.id', $schoolA->id)
        ->assertJsonPath('data.schools.0.roles', [['role' => 'director', 'cycle_id' => $kindergarten->id]])
        ->assertJsonPath('data.schools.1.id', $schoolB->id);

    // Clés avec des points : lues directement (assertJsonPath les prendrait pour des chemins)
    $permissionsA = $me->json('data.schools.0.permissions');
    $permissionsB = $me->json('data.schools.1.permissions');
    \assert(is_array($permissionsA) && is_array($permissionsB));

    // Directeur limité à la maternelle : permissions sur ce seul cycle
    expect($permissionsA['school.settings.manage'] ?? 'absent')->toBe([$kindergarten->id])
        ->and($permissionsA['grades.validate'] ?? 'absent')->toBe([$kindergarten->id])
        ->and($permissionsA)->not->toHaveKey('billing.pay')
        // Comptable de toute l'école B
        ->and(array_key_exists('billing.manage', $permissionsB) ? $permissionsB['billing.manage'] : 'absent')->toBeNull()
        ->and($permissionsB)->not->toHaveKey('students.manage');
});

it('ne divulgue ni le mot de passe ni le jeton de session', function (): void {
    $user = actingAsRole(Role::Teacher, makeSchool());

    $json = (string) spa('GET', '/api/v1/me')->assertOk()->getContent();

    expect($json)->not->toContain('password":"')
        ->and($json)->not->toContain('remember_token')
        ->and($json)->toContain($user->phone);
});

it('donne les permissions d’un rôle personnalisé, sous sa clé d’affectation', function (): void {
    $school = makeSchool(['primary']);
    $role = customRole($school, ['students.view', 'attendance.manage']);
    $user = makeUser();
    assignRole($user, $school, $role->id);
    login($user)->assertOk();

    $me = spa('GET', '/api/v1/me')->assertOk()
        ->assertJsonPath('data.schools.0.roles', [['role' => $role->id, 'cycle_id' => null]]);

    $permissions = $me->json('data.schools.0.permissions');
    \assert(is_array($permissions));
    expect(array_keys($permissions))->toBe(['students.view', 'attendance.manage']);
});
