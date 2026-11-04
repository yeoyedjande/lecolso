<?php

declare(strict_types=1);

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Enums\Role;
use App\Support\Tenancy\TenantContext;

it('applique les permissions par rôle et par cycle', function (): void {
    $school = makeSchool(null);
    $kindergarten = cycleOf($school, 'kindergarten');
    $primary = cycleOf($school, 'primary');
    $director = makeUser();
    assignRole($director, $school, Role::Director, $kindergarten);
    $accountant = makeUser();
    assignRole($accountant, $school, Role::Accountant);

    $authorizer = app(Authorizer::class);
    app(TenantContext::class)->setUser($director->id);

    expect($authorizer->allows($director, 'grades.validate', $school, $kindergarten))->toBeTrue()
        ->and($authorizer->allows($director, 'grades.validate', $school, $primary))->toBeFalse()
        // Ressource de toute l'école : une affectation limitée à un cycle ne suffit pas
        ->and($authorizer->allows($director, 'school.settings.manage', $school))->toBeFalse()
        ->and($authorizer->cycleScope($director, $school))->toBe([$kindergarten->id]);

    app(TenantContext::class)->setUser($accountant->id);

    expect($authorizer->allows($accountant, 'billing.manage', $school))->toBeTrue()
        ->and($authorizer->allows($accountant, 'billing.manage', $school, $primary))->toBeTrue()
        ->and($authorizer->allows($accountant, 'grades.manage', $school, $primary))->toBeFalse()
        ->and($authorizer->cycleScope($accountant, $school))->toBeNull();
});

it('refuse une permission absente de la matrice', function (): void {
    $user = makeUser();

    expect(static fn () => app(Authorizer::class)->allows($user, 'students.delete_everything', makeSchool()))
        ->toThrow(InvalidArgumentException::class, 'students.delete_everything');
});

it('n’accorde rien dans une école où l’utilisateur n’a aucune affectation', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();
    $user = makeUser();
    assignRole($user, $schoolA, Role::Director);

    app(TenantContext::class)->setUser($user->id);

    expect(app(Authorizer::class)->allows($user, 'students.view', $schoolB))->toBeFalse()
        ->and(app(Authorizer::class)->permissionsFor($user, $schoolB))->toBe([]);
});
