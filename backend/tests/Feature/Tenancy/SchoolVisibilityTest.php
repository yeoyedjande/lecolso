<?php

declare(strict_types=1);

use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\Organization;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * A (dans un groupe scolaire) et B : l'utilisateur y est affecté. C : aucune affectation.
 *
 * @return array{0: User, 1: School, 2: School, 3: School}
 */
function userWithTwoOfThreeSchools(): array
{
    $organization = Organization::factory()->createOne();
    $schoolA = makeSchool(['primary'], ['organization_id' => $organization->id]);
    $schoolB = makeSchool(['primary']);
    $schoolC = makeSchool();

    $user = makeUser();
    assignRole($user, $schoolA, Role::Director);
    assignRole($user, $schoolB, Role::Teacher);

    return [$user, $schoolA, $schoolB, $schoolC];
}

/** @return list<string> */
function visibleSchoolIds(): array
{
    // SQL brut volontaire : on teste la RLS de schools, pas un scope Eloquent
    return distinctColumn('id', 'select id from schools');
}

it('ne montre aucune école sans contexte', function (): void {
    userWithTwoOfThreeSchools();

    expect(visibleSchoolIds())->toBe([])
        ->and(DB::scalar('select count(*) from organizations'))->toBe(0);
});

it('montre à un utilisateur les seules écoles où il a une affectation', function (): void {
    [$user, $schoolA, $schoolB, $schoolC] = userWithTwoOfThreeSchools();

    app(TenantContext::class)->setUser($user->id);

    expect(visibleSchoolIds())->toEqualCanonicalizing([$schoolA->id, $schoolB->id])
        ->and(School::query()->find($schoolC->id))->toBeNull()
        // Ses affectations, dans toutes ses écoles (pour /me)
        ->and(DB::scalar('select count(*) from role_assignments'))->toBe(2)
        // Le groupe scolaire de l'école A est visible
        ->and(DB::scalar('select count(*) from organizations'))->toBe(1);
});

it('montre l’école courante, sans les autres, dans le contexte d’une école', function (): void {
    [, , , $schoolC] = userWithTwoOfThreeSchools();

    expect(inSchool($schoolC, static fn (): array => visibleSchoolIds()))->toBe([$schoolC->id]);
});

it('ne montre pas les affectations des autres utilisateurs dans d’autres écoles', function (): void {
    [$user, , , $schoolC] = userWithTwoOfThreeSchools();
    $other = makeUser();
    assignRole($other, $schoolC, Role::Accountant);

    app(TenantContext::class)->setUser($user->id);

    expect(DB::scalar('select count(*) from role_assignments where user_id = ?', [$other->id]))->toBe(0);
});

it('refuse à la connexion applicative de créer ou supprimer une école', function (): void {
    [, $schoolA] = userWithTwoOfThreeSchools();

    expect(static fn () => DB::insert(
        "insert into schools (id, name, slug, type) values (gen_random_uuid(), 'Pirate', 'pirate', 'preschool_primary')",
    ))->toThrow(QueryException::class, 'row-level security');

    inSchool($schoolA, function () use ($schoolA): void {
        expect(DB::delete('delete from schools where id = ?', [$schoolA->id]))->toBe(0);
    });
});

it('autorise l’école courante à modifier sa propre fiche, pas celle d’une autre', function (): void {
    [, $schoolA, $schoolB] = userWithTwoOfThreeSchools();

    inSchool($schoolA, function () use ($schoolA, $schoolB): void {
        expect(DB::update('update schools set city = ? where id = ?', ['Bouaké', $schoolA->id]))->toBe(1)
            ->and(DB::update('update schools set city = ? where id = ?', ['Bouaké', $schoolB->id]))->toBe(0);
    });
});
