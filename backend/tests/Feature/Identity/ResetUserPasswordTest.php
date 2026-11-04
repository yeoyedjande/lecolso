<?php

declare(strict_types=1);

use App\Domains\Identity\Actions\ResetUserPassword;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use Illuminate\Support\Str;
use Tests\Support\SpaClient;

it('permet à un directeur de réinitialiser le mot de passe d’un enseignant de son école', function (): void {
    $school = makeSchool(null);
    $teacher = makeUser();
    assignRole($teacher, $school, Role::Teacher, cycleOf($school, 'primary'));
    actingAsRole(Role::Director, $school);

    $provisional = spa('POST', "/api/v1/users/{$teacher->id}/password-reset", [], $school)
        ->assertOk()
        ->json('provisional_password');

    expect($provisional)->toBeString()->toHaveLength(ResetUserPassword::LENGTH);
    \assert(is_string($provisional));

    // L'enseignant se connecte avec le mot de passe provisoire, puis doit le changer
    SpaClient::reset();
    login($teacher)->assertUnprocessable();
    login($teacher, $provisional)->assertOk()->assertJsonPath('data.must_change_password', true);
});

it('permet aussi à une secrétaire de réinitialiser le mot de passe d’un parent', function (): void {
    $school = makeSchool();
    $parent = makeUser();
    assignRole($parent, $school, Role::Guardian);
    actingAsRole(Role::Secretary, $school);

    spa('POST', "/api/v1/users/{$parent->id}/password-reset", [], $school)->assertOk();
});

it('refuse aux autres rôles de réinitialiser un mot de passe', function (Role $role): void {
    $school = makeSchool();
    $parent = makeUser();
    assignRole($parent, $school, Role::Guardian);
    actingAsRole($role, $school);

    spa('POST', "/api/v1/users/{$parent->id}/password-reset", [], $school)->assertForbidden();
})->with([Role::Teacher, Role::Accountant, Role::Guardian, Role::Promoter]);

it('limite un directeur de la maternelle aux comptes de la maternelle', function (): void {
    $school = makeSchool(null);
    $kindergartenTeacher = makeUser();
    assignRole($kindergartenTeacher, $school, Role::Teacher, cycleOf($school, 'kindergarten'));
    $primaryTeacher = makeUser();
    assignRole($primaryTeacher, $school, Role::Teacher, cycleOf($school, 'primary'));
    $wholeSchoolSecretary = makeUser();
    assignRole($wholeSchoolSecretary, $school, Role::Secretary);

    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));

    spa('POST', "/api/v1/users/{$kindergartenTeacher->id}/password-reset", [], $school)->assertOk();
    spa('POST', "/api/v1/users/{$primaryTeacher->id}/password-reset", [], $school)->assertForbidden();
    spa('POST', "/api/v1/users/{$wholeSchoolSecretary->id}/password-reset", [], $school)->assertForbidden();
});

it('répond 404 pour un utilisateur d’une autre école (isolation)', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();
    $memberOfB = makeUser();
    assignRole($memberOfB, $schoolB, Role::Teacher);

    actingAsRole(Role::Director, $schoolA);

    // Dans l'école A : l'utilisateur de B est introuvable
    spa('POST', "/api/v1/users/{$memberOfB->id}/password-reset", [], $schoolA)->assertNotFound();
    // En se réclamant de l'école B : pas membre de B
    spa('POST', "/api/v1/users/{$memberOfB->id}/password-reset", [], $schoolB)->assertNotFound();
    // Identifiant inexistant
    spa('POST', '/api/v1/users/'.Str::uuid7().'/password-reset', [], $schoolA)->assertNotFound();

    expect(login($memberOfB)->status())->toBe(200);
});

it('refuse de réinitialiser son propre mot de passe par cette route', function (): void {
    $school = makeSchool();
    $director = actingAsRole(Role::Director, $school);

    spa('POST', "/api/v1/users/{$director->id}/password-reset", [], $school)->assertForbidden();
});

it('ne laisse pas un directeur modifier en base un utilisateur d’une autre école', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();
    $memberOfB = makeUser();
    assignRole($memberOfB, $schoolB, Role::Teacher);

    // Même en contournant l'API : la RLS de users refuse la mise à jour hors de l'école courante
    $updated = inSchool($schoolA, static fn (): int => User::query()->whereKey($memberOfB->id)->update(['must_change_password' => true]));

    expect($updated)->toBe(0);
});
