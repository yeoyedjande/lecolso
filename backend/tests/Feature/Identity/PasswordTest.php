<?php

declare(strict_types=1);

use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;

/**
 * Compte créé par le personnel, avec un mot de passe provisoire, puis connecté.
 *
 * @return array{0: User, 1: School}
 */
function userWithProvisionalPassword(): array
{
    $school = makeSchool(['primary']);
    $user = User::factory()->withProvisionalPassword()->createOne();
    assignRole($user, $school, Role::Teacher);
    login($user)->assertOk()->assertJsonPath('data.must_change_password', true);

    return [$user, $school];
}

it('n’autorise que /me, le changement de mot de passe et la déconnexion avant de changer un mot de passe provisoire', function (): void {
    [, $school] = userWithProvisionalPassword();

    spa('GET', '/api/v1/me')->assertOk()->assertJsonPath('data.must_change_password', true);
    spa('GET', '/api/v1/cycles', [], $school)
        ->assertForbidden()
        ->assertJsonPath('code', 'password_change_required');
    spa('GET', '/api/v1/platform/schools')->assertForbidden();
    spa('POST', '/api/v1/auth/logout')->assertNoContent();
});

it('change le mot de passe provisoire puis donne accès à l’application', function (): void {
    [$user, $school] = userWithProvisionalPassword();

    spa('POST', '/api/v1/auth/password', [
        'current_password' => 'password',
        'password' => 'nouveau-secret',
        'password_confirmation' => 'nouveau-secret',
    ])->assertNoContent();

    spa('GET', '/api/v1/me')->assertOk()->assertJsonPath('data.must_change_password', false);
    spa('GET', '/api/v1/cycles', [], $school)->assertOk();

    // L'ancien mot de passe ne fonctionne plus, le nouveau oui
    spa('POST', '/api/v1/auth/logout')->assertNoContent();
    login($user)->assertUnprocessable();
    login($user, 'nouveau-secret')->assertOk();
});

it('valide le changement de mot de passe', function (array $payload, string $field): void {
    userWithProvisionalPassword();

    spa('POST', '/api/v1/auth/password', $payload)->assertUnprocessable()->assertJsonValidationErrors([$field]);
})->with([
    'mot de passe actuel faux' => [['current_password' => 'faux', 'password' => 'nouveau-secret', 'password_confirmation' => 'nouveau-secret'], 'current_password'],
    'moins de 8 caractères' => [['current_password' => 'password', 'password' => 'court', 'password_confirmation' => 'court'], 'password'],
    'confirmation différente' => [['current_password' => 'password', 'password' => 'nouveau-secret', 'password_confirmation' => 'autre-chose'], 'password'],
    'identique à l’actuel' => [['current_password' => 'password', 'password' => 'password', 'password_confirmation' => 'password'], 'password'],
]);

it('exige une session pour changer son mot de passe', function (): void {
    spa('POST', '/api/v1/auth/password', ['current_password' => 'password', 'password' => 'nouveau-secret'])
        ->assertUnauthorized();
});
