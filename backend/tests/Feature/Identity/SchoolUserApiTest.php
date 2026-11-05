<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Cycle;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\MemberDeactivation;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;

/** Compte avec un nom donné, affecté à $school. */
function member(School $school, Role|string $role, string $name, ?Cycle $cycle = null): User
{
    $user = User::factory()->createOne(['name' => $name]);
    assignRole($user, $school, $role, $cycle);

    return $user;
}

/**
 * @param  list<mixed>  $bindings
 */
function ownerScalar(string $sql, array $bindings = []): mixed
{
    return DB::connection('pgsql_owner')->scalar($sql, $bindings);
}

// --- Liste et fiche --------------------------------------------------------------------------------------------

it('liste les comptes de l’école par nom, avec leurs rôles et leur statut', function (): void {
    $school = makeSchool(['primary']);
    $primary = cycleOf($school, 'primary');
    member($school, Role::Teacher, 'Bamba Fatou', $primary);
    member($school, Role::Accountant, 'Assi Moussa');
    login(member($school, Role::Director, 'Zadi Yao'))->assertOk();

    $response = spa('GET', '/api/v1/users', [], $school)->assertOk()->assertJsonCount(3, 'data');

    expect(array_column((array) $response->json('data'), 'name'))->toBe(['Assi Moussa', 'Bamba Fatou', 'Zadi Yao']);
    $response->assertJsonPath('data.1.roles.0.role', 'teacher')
        ->assertJsonPath('data.1.roles.0.cycle_id', $primary->id)
        ->assertJsonPath('data.1.active', true)
        ->assertJsonPath('data.1.can_manage', true)
        // Son propre compte : jamais géré par soi-même
        ->assertJsonPath('data.2.can_manage', false);
});

it('filtre par recherche, rôle et statut', function (): void {
    $school = makeSchool(['primary']);
    $teacher = member($school, Role::Teacher, 'Bamba Fatou');
    member($school, Role::Accountant, 'Assi Moussa');
    $director = actingAsRole(Role::Director, $school);
    spa('POST', "/api/v1/users/{$teacher->id}/deactivate", [], $school)->assertOk();

    $names = static fn (array $query): array => array_column(
        (array) spa('GET', '/api/v1/users?'.http_build_query($query), [], $school)->assertOk()->json('data'),
        'name',
    );

    expect($names(['search' => 'bamba']))->toBe(['Bamba Fatou'])
        ->and($names(['role' => 'accountant']))->toBe(['Assi Moussa'])
        ->and($names(['status' => 'deactivated']))->toBe(['Bamba Fatou'])
        ->and($names(['status' => 'active']))->not->toContain('Bamba Fatou')
        ->and($names(['search' => substr($teacher->phone, -6)]))->toBe(['Bamba Fatou'])
        ->and($director->id)->not->toBe($teacher->id);
});

it('limite la liste d’une direction de cycle aux comptes de son cycle', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    $kindergarten = cycleOf($school, 'kindergarten');
    member($school, Role::Teacher, 'Maternelle', $kindergarten);
    member($school, Role::Teacher, 'Primaire', cycleOf($school, 'primary'));
    member($school, Role::Accountant, 'Toute l’école');
    login(member($school, Role::Director, 'Directrice maternelle', $kindergarten))->assertOk();

    $names = array_column((array) spa('GET', '/api/v1/users', [], $school)->assertOk()->json('data'), 'name');

    // Elle-même et les comptes de son cycle, ni le primaire ni les comptes de toute l'école
    expect($names)->toBe(['Directrice maternelle', 'Maternelle']);
});

it('réserve la liste à qui voit les utilisateurs ou réinitialise leurs mots de passe', function (Role $role): void {
    $school = makeSchool();
    actingAsRole($role, $school);

    spa('GET', '/api/v1/users', [], $school)->assertForbidden();
})->with([Role::Accountant, Role::Teacher, Role::Guardian]);

it('donne la liste en lecture au secrétariat, qui réinitialise les mots de passe', function (): void {
    $school = makeSchool();
    $teacher = member($school, Role::Teacher, 'Koffi');
    actingAsRole(Role::Secretary, $school);

    $list = (array) spa('GET', '/api/v1/users', [], $school)->assertOk()->json('data');
    expect(array_column($list, 'can_manage'))->each->toBeFalse();
    spa('GET', "/api/v1/users/{$teacher->id}", [], $school)->assertOk()->assertJsonPath('data.can_manage', false);
    spa('PATCH', "/api/v1/users/{$teacher->id}", ['name' => 'Autre'], $school)->assertForbidden();
    spa('POST', '/api/v1/users', ['name' => 'Ab', 'phone' => '0711223344', 'roles' => [['role' => 'teacher']]], $school)
        ->assertForbidden();
});

it('isole les comptes entre écoles (404, rien à deviner)', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();
    $memberA = member($schoolA, Role::Teacher, 'Enseignant A');
    actingAsRole(Role::Director, $schoolB);

    $ids = array_column((array) spa('GET', '/api/v1/users', [], $schoolB)->assertOk()->json('data'), 'id');
    expect($ids)->not->toContain($memberA->id);

    spa('GET', "/api/v1/users/{$memberA->id}", [], $schoolB)->assertNotFound();
    spa('PATCH', "/api/v1/users/{$memberA->id}", ['name' => 'Piraté'], $schoolB)->assertNotFound();
    spa('POST', "/api/v1/users/{$memberA->id}/deactivate", [], $schoolB)->assertNotFound();
    spa('POST', "/api/v1/users/{$memberA->id}/roles", ['role' => 'teacher'], $schoolB)->assertNotFound();
    spa('DELETE', "/api/v1/users/{$memberA->id}", [], $schoolB)->assertNotFound();

    expect(ownerScalar('select name from users where id = ?', [$memberA->id]))->toBe('Enseignant A');
});

// --- Création --------------------------------------------------------------------------------------------------

it('crée un compte avec un mot de passe provisoire et ses rôles', function (): void {
    $school = makeSchool(['primary']);
    $primary = cycleOf($school, 'primary');
    actingAsRole(Role::Director, $school);

    $response = spa('POST', '/api/v1/users', [
        'name' => 'Koffi Enseignant',
        'phone' => '07 11 22 33 44',
        'email' => 'Koffi@Exemple.ci',
        'roles' => [['role' => 'teacher', 'cycle_id' => $primary->id]],
    ], $school)
        ->assertCreated()
        ->assertJsonPath('data.name', 'Koffi Enseignant')
        ->assertJsonPath('data.phone', '+2250711223344')
        ->assertJsonPath('data.email', 'koffi@exemple.ci')
        ->assertJsonPath('data.must_change_password', true)
        ->assertJsonPath('data.roles.0.role', 'teacher')
        ->assertJsonPath('data.roles.0.cycle_id', $primary->id);

    $password = $response->json('provisional_password');
    \assert(is_string($password));
    expect(strlen($password))->toBe(10);

    // Le nouveau compte se connecte avec son mot de passe provisoire
    spa('POST', '/api/v1/auth/logout')->assertNoContent();
    spa('POST', '/api/v1/auth/login', ['login' => '0711223344', 'password' => $password])
        ->assertOk()
        ->assertJsonPath('data.must_change_password', true);
});

it('rattache le compte existant d’une autre école sans changer son nom ni son mot de passe', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();
    $teacher = member($schoolA, Role::Teacher, 'Awa Enseignante');
    actingAsRole(Role::Director, $schoolB);

    spa('POST', '/api/v1/users', [
        'name' => 'Autre nom',
        'phone' => $teacher->phone,
        'roles' => [['role' => 'teacher']],
    ], $schoolB)
        ->assertCreated()
        ->assertJsonPath('data.id', $teacher->id)
        ->assertJsonPath('data.name', 'Awa Enseignante')
        ->assertJsonPath('provisional_password', null);

    expect(ownerScalar('select count(*) from role_assignments where user_id = ?', [$teacher->id]))->toBe(2);
    login($teacher)->assertOk();
});

it('valide la création', function (array $payload, string $field): void {
    $school = makeSchool(['primary']);
    assignRole(User::factory()->createOne(['phone' => '+2250700000999']), $school, Role::Teacher);
    User::factory()->createOne(['email' => 'pris@exemple.ci']);
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/users', $payload, $school)->assertUnprocessable()->assertJsonValidationErrors([$field]);
})->with([
    'sans rôle' => [['name' => 'Kofi', 'phone' => '0711223344', 'roles' => []], 'roles'],
    'téléphone invalide' => [['name' => 'Kofi', 'phone' => '123', 'roles' => [['role' => 'teacher']]], 'phone'],
    'déjà membre' => [['name' => 'Kofi', 'phone' => '0700000999', 'roles' => [['role' => 'teacher']]], 'phone'],
    'e-mail déjà pris' => [['name' => 'Kofi', 'phone' => '0711223344', 'email' => 'PRIS@exemple.ci', 'roles' => [['role' => 'teacher']]], 'email'],
    'rôle inconnu' => [['name' => 'Kofi', 'phone' => '0711223344', 'roles' => [['role' => '0195f000-0000-7000-8000-00000000dead']]], 'roles.0.role'],
    'cycle inconnu' => [['name' => 'Kofi', 'phone' => '0711223344', 'roles' => [['role' => 'teacher', 'cycle_id' => '0195f000-0000-7000-8000-00000000dead']]], 'roles.0.cycle_id'],
]);

it('réserve les rôles Promoteur et Direction au promoteur', function (): void {
    $school = makeSchool();
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/users', ['name' => 'Adjoint', 'phone' => '0711223344', 'roles' => [['role' => 'director']]], $school)
        ->assertForbidden();

    actingAsRole(Role::Promoter, $school);
    spa('POST', '/api/v1/users', ['name' => 'Adjoint', 'phone' => '0711223344', 'roles' => [['role' => 'director']]], $school)
        ->assertCreated();
});

it('limite une direction de cycle aux rôles de son cycle', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    $kindergarten = cycleOf($school, 'kindergarten');
    actingAsRole(Role::Director, $school, $kindergarten);

    spa('POST', '/api/v1/users', ['name' => 'A', 'phone' => '0711223344', 'roles' => [['role' => 'teacher']]], $school)
        ->assertForbidden();
    spa('POST', '/api/v1/users', ['name' => 'Ab', 'phone' => '0711223344', 'roles' => [['role' => 'teacher', 'cycle_id' => cycleOf($school, 'primary')->id]]], $school)
        ->assertForbidden();
    spa('POST', '/api/v1/users', ['name' => 'Ab', 'phone' => '0711223344', 'roles' => [['role' => 'teacher', 'cycle_id' => $kindergarten->id]]], $school)
        ->assertCreated();
});

it('n’attribue pas un rôle dont on ne détient pas toutes les permissions (pas d’élévation)', function (): void {
    $school = makeSchool();
    $treasurer = customRole($school, ['billing.view', 'subscription.pay'], 'Trésorier');
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/users', ['name' => 'Tresorier', 'phone' => '0711223344', 'roles' => [['role' => $treasurer->id]]], $school)
        ->assertForbidden();
    // Rôle Parent : ses permissions propres aux parents n'élèvent pas les droits de la direction
    spa('POST', '/api/v1/users', ['name' => 'Parent', 'phone' => '0711223355', 'roles' => [['role' => 'guardian']]], $school)
        ->assertCreated();
});

// --- Modification et rôles -------------------------------------------------------------------------------------

it('modifie un compte de l’école, identifiants uniques', function (): void {
    $school = makeSchool();
    $teacher = member($school, Role::Teacher, 'Ancien nom');
    $other = member($school, Role::Teacher, 'Autre');
    actingAsRole(Role::Director, $school);

    spa('PATCH', "/api/v1/users/{$teacher->id}", ['name' => 'Nouveau nom', 'phone' => '0799887766', 'email' => null], $school)
        ->assertOk()
        ->assertJsonPath('data.name', 'Nouveau nom')
        ->assertJsonPath('data.phone', '+2250799887766')
        ->assertJsonPath('data.email', null);

    spa('PATCH', "/api/v1/users/{$teacher->id}", ['phone' => $other->phone], $school)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['phone']);
});

it('protège son propre compte et le compte du promoteur', function (): void {
    $school = makeSchool();
    $promoter = member($school, Role::Promoter, 'Promoteur');
    $director = actingAsRole(Role::Director, $school);

    spa('PATCH', "/api/v1/users/{$director->id}", ['name' => 'Moi'], $school)->assertForbidden();
    spa('POST', "/api/v1/users/{$director->id}/deactivate", [], $school)->assertForbidden();
    spa('DELETE', "/api/v1/users/{$director->id}", [], $school)->assertForbidden();
    spa('PATCH', "/api/v1/users/{$promoter->id}", ['name' => 'Piraté'], $school)->assertForbidden();
    spa('POST', "/api/v1/users/{$promoter->id}/deactivate", [], $school)->assertForbidden();
    spa('DELETE', "/api/v1/users/{$promoter->id}", [], $school)->assertForbidden();
});

it('attribue et retire des rôles, sans jamais retirer le dernier', function (): void {
    $school = makeSchool(['primary']);
    $user = member($school, Role::Teacher, 'Koffi');
    actingAsRole(Role::Director, $school);

    $response = spa('POST', "/api/v1/users/{$user->id}/roles", ['role' => 'secretary'], $school)
        ->assertOk()
        ->assertJsonCount(2, 'data.roles');
    spa('POST', "/api/v1/users/{$user->id}/roles", ['role' => 'secretary'], $school)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['role']);

    $ids = array_column((array) $response->json('data.roles'), 'id', 'role');
    $secretary = $ids['secretary'] ?? null;
    $teacher = $ids['teacher'] ?? null;
    \assert(is_string($secretary) && is_string($teacher));

    spa('DELETE', "/api/v1/users/{$user->id}/roles/{$secretary}", [], $school)->assertOk()->assertJsonCount(1, 'data.roles');
    spa('DELETE', "/api/v1/users/{$user->id}/roles/{$teacher}", [], $school)
        ->assertConflict()
        ->assertJsonPath('code', 'last_role');
});

it('réserve le retrait du rôle Direction au promoteur et refuse une affectation d’un autre compte', function (): void {
    $school = makeSchool();
    $otherDirector = member($school, Role::Director, 'Directrice adjointe');
    $teacher = member($school, Role::Teacher, 'Koffi');
    $assignment = inSchool($school, static fn () => RoleAssignment::query()
        ->where('user_id', $otherDirector->id)->firstOrFail());
    actingAsRole(Role::Director, $school);

    spa('POST', "/api/v1/users/{$otherDirector->id}/roles", ['role' => 'teacher'], $school)->assertOk();
    spa('DELETE', "/api/v1/users/{$otherDirector->id}/roles/{$assignment->id}", [], $school)->assertForbidden();
    // L'affectation n'appartient pas au compte de l'URL
    spa('DELETE', "/api/v1/users/{$teacher->id}/roles/{$assignment->id}", [], $school)->assertNotFound();
});

// --- Désactivation et suppression -------------------------------------------------------------------------------

it('désactive un compte : accès à l’école coupé, rôles conservés ; puis le réactive', function (): void {
    $school = makeSchool();
    $teacher = member($school, Role::Teacher, 'Koffi');
    actingAsRole(Role::Director, $school);

    spa('POST', "/api/v1/users/{$teacher->id}/deactivate", [], $school)
        ->assertOk()
        ->assertJsonPath('data.active', false)
        ->assertJsonPath('data.roles.0.role', 'teacher');

    login($teacher)->assertOk();
    spa('GET', '/api/v1/me')->assertOk()->assertJsonCount(0, 'data.schools');
    spa('GET', '/api/v1/cycles', [], $school)->assertNotFound();

    actingAsRole(Role::Director, $school);
    spa('POST', "/api/v1/users/{$teacher->id}/reactivate", [], $school)->assertOk()->assertJsonPath('data.active', true);

    login($teacher)->assertOk();
    spa('GET', '/api/v1/me')->assertOk()->assertJsonCount(1, 'data.schools');
});

it('supprime un compte : effacé s’il n’a pas d’autre école', function (): void {
    $school = makeSchool();
    $teacher = member($school, Role::Teacher, 'Koffi');
    actingAsRole(Role::Director, $school);

    spa('DELETE', "/api/v1/users/{$teacher->id}", [], $school)->assertOk()->assertJsonPath('erased', true);

    expect(ownerScalar('select count(*) from users where id = ?', [$teacher->id]))->toBe(0);
});

it('supprime un compte de l’école seulement s’il appartient à une autre école', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();
    $teacher = member($schoolA, Role::Teacher, 'Koffi');
    assignRole($teacher, $schoolB, Role::Teacher);
    actingAsRole(Role::Director, $schoolA);

    spa('DELETE', "/api/v1/users/{$teacher->id}", [], $schoolA)->assertOk()->assertJsonPath('erased', false);

    expect(ownerScalar('select count(*) from role_assignments where user_id = ?', [$teacher->id]))->toBe(1)
        ->and(ownerScalar('select school_id from role_assignments where user_id = ?', [$teacher->id]))->toBe($schoolB->id);
    login($teacher)->assertOk();
    spa('GET', '/api/v1/me')->assertOk()->assertJsonPath('data.schools.0.id', $schoolB->id);
});

// --- Base de données -------------------------------------------------------------------------------------------

it('n’efface par forget_user qu’un compte sans aucune école, jamais un super-admin', function (): void {
    $school = makeSchool();
    $member = member($school, Role::Teacher, 'Membre');
    $orphan = makeUser();
    $admin = superAdmin();

    expect(DB::scalar('select forget_user(?)', [$member->id]))->toBeFalse()
        ->and(DB::scalar('select forget_user(?)', [$admin->id]))->toBeFalse()
        ->and(DB::scalar('select forget_user(?)', [$orphan->id]))->toBeTrue()
        ->and(ownerScalar('select count(*) from users where id in (?, ?)', [$member->id, $admin->id]))->toBe(2);
});

it('isole les désactivations entre écoles en SQL brut', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();
    $teacher = member($schoolA, Role::Teacher, 'Koffi');
    assignRole($teacher, $schoolB, Role::Teacher);
    inSchool($schoolA, static fn () => MemberDeactivation::query()->create(['user_id' => $teacher->id]));

    expect(rows('select id from member_deactivations'))->toBe([])
        ->and(inSchool($schoolB, static fn (): array => rows('select id from member_deactivations')))->toBe([])
        ->and(inSchool($schoolA, static fn (): int => count(rows('select id from member_deactivations'))))->toBe(1);

    // Le compte voit sa propre désactivation (calcul de /me), pas celles des autres
    app(TenantContext::class)->setUser($teacher->id);
    expect(count(rows('select id from member_deactivations')))->toBe(1);
});

it('pagine par curseur au-delà de 25 comptes', function (): void {
    $school = makeSchool();
    foreach (range(1, 27) as $index) {
        member($school, Role::Teacher, sprintf('Enseignant %02d', $index));
    }
    login(member($school, Role::Director, 'Zz Directeur'))->assertOk();

    $first = spa('GET', '/api/v1/users', [], $school)->assertOk()->assertJsonCount(25, 'data');
    $cursor = $first->json('meta.next_cursor');
    \assert(is_string($cursor));

    $second = spa('GET', '/api/v1/users?cursor='.urlencode($cursor), [], $school)->assertOk()
        ->assertJsonPath('meta.next_cursor', null);

    expect(array_column((array) $second->json('data'), 'name'))->toBe(['Enseignant 26', 'Enseignant 27', 'Zz Directeur']);
});
