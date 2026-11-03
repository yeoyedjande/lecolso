<?php

declare(strict_types=1);

use App\Domains\Identity\Enums\Role;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;

/*
| RLS de users, en SQL brut (sans scope Eloquent) : les téléphones et e-mails des parents
| d'une école ne sont jamais lisibles depuis une autre.
*/

it('ne montre aucun utilisateur sans contexte', function (): void {
    makeUser();
    makeUser();

    expect(DB::scalar('select count(*) from users'))->toBe(0);
});

it('ne montre que soi-même dans le contexte d’un utilisateur', function (): void {
    $user = makeUser();
    makeUser();

    app(TenantContext::class)->setUser($user->id);

    expect(distinctColumn('id', 'select id from users'))->toBe([$user->id]);
});

it('montre les membres de l’école courante, et eux seuls', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();
    $memberA = makeUser();
    assignRole($memberA, $schoolA, Role::Teacher);
    $parentA = makeUser();
    assignRole($parentA, $schoolA, Role::Guardian);
    $memberB = makeUser();
    assignRole($memberB, $schoolB, Role::Teacher);

    expect(inSchool($schoolA, static fn (): array => distinctColumn('id', 'select id from users')))
        ->toEqualCanonicalizing([$memberA->id, $parentA->id])
        ->and(inSchool($schoolA, static fn (): mixed => DB::scalar('select phone from users where id = ?', [$memberB->id])))
        ->toBeNull();
});

it('trouve un compte par la fonction de connexion, sans rien révéler d’autre', function (): void {
    $user = makeUser();

    expect(DB::scalar('select auth_user_id(?)', [$user->phone]))->toBe($user->id)
        ->and(DB::scalar('select auth_user_id(?)', ['+2250000000000']))->toBeNull()
        // Fonction SECURITY DEFINER : la table reste invisible pour app_user
        ->and(DB::scalar('select count(*) from users'))->toBe(0);
});

it('ne permet ni de supprimer un utilisateur ni de modifier celui d’une autre école', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();
    $memberB = makeUser();
    assignRole($memberB, $schoolB, Role::Teacher);

    inSchool($schoolA, function () use ($memberB): void {
        expect(DB::update('update users set name = ? where id = ?', ['Piraté', $memberB->id]))->toBe(0)
            ->and(DB::delete('delete from users where id = ?', [$memberB->id]))->toBe(0);
    });

    app(TenantContext::class)->setUser($memberB->id);
    expect(DB::delete('delete from users where id = ?', [$memberB->id]))->toBe(0);
});
