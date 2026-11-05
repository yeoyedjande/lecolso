<?php

declare(strict_types=1);

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Academic\Models\Level;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\SchoolRole;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Actions\EnrollStudent;
use App\Domains\Students\Data\GuardianInput;
use App\Domains\Students\Data\NewEnrollment;
use App\Domains\Students\Enums\Gender;
use App\Domains\Students\Enums\GuardianRelation;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\Platform;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;
use Tests\Support\SpaClient;
use Tests\TestCase;

// Tous les tests (Feature et Unit) démarrent l'application Laravel ; base vidée avant chaque test (TestCase)
pest()->extend(TestCase::class)->in('Feature', 'Unit');

/**
 * École de test, créée par la connexion super-admin puis rebasculée sur la connexion applicative.
 *
 * @param  list<string>|null  $cycles  cycles du catalogue à ouvrir ; null = tous ; [] = aucun
 * @param  array<string, mixed>  $attributes
 */
function makeSchool(?array $cycles = [], array $attributes = []): School
{
    $factory = $cycles === [] ? School::factory() : School::factory()->withCycles($cycles);

    return $factory->createOne($attributes);
}

/**
 * Lignes d'une requête SQL brute, sous forme de tableaux associatifs.
 *
 * @param  array<int, mixed>  $bindings
 * @return list<array<array-key, mixed>>
 */
function rows(string $sql, array $bindings = []): array
{
    return array_values(array_map(
        static fn (mixed $row): array => (array) $row,
        DB::select($sql, $bindings),
    ));
}

/**
 * Valeurs distinctes et triées d'une colonne texte (identifiants), en SQL brut.
 *
 * @param  array<int, mixed>  $bindings
 * @return list<string>
 */
function distinctColumn(string $column, string $sql, array $bindings = []): array
{
    $values = array_map(
        static fn (mixed $value): string => is_string($value) ? $value : get_debug_type($value),
        array_column(rows($sql, $bindings), $column),
    );
    $values = array_values(array_unique($values));
    sort($values);

    return $values;
}

/**
 * Exécute $callback dans le contexte de $school (variable PostgreSQL app.school_id + CurrentSchool),
 * puis rétablit le contexte précédent.
 *
 * @template TResult
 *
 * @param  callable(): TResult  $callback
 * @return TResult
 */
function inSchool(School $school, callable $callback): mixed
{
    return app(TenantContext::class)->run($school, $callback);
}

function makeUser(): User
{
    return User::factory()->createOne();
}

function superAdmin(): User
{
    $user = makeUser();

    // is_super_admin n'est ni assignable en masse ni modifiable par app_user : écriture super-admin explicite
    Platform::run(static fn (): int => User::query()->whereKey($user->id)->update(['is_super_admin' => true]));
    $user->forceFill(['is_super_admin' => true])->syncOriginal();

    return $user;
}

/**
 * Requête du frontend (cookie de session, en-tête Origin), avec l'école courante si fournie.
 *
 * @param  array<array-key, mixed>  $data  corps JSON
 * @param  array<string, string>  $server
 * @return TestResponse<Response>
 */
function spa(string $method, string $uri, array $data = [], ?School $school = null, array $server = []): TestResponse
{
    return SpaClient::request($method, $uri, $data, $school === null ? [] : ['X-School-Id' => $school->id], $server);
}

/**
 * Connexion réelle par POST /api/v1/auth/login (session par cookie).
 *
 * @return TestResponse<Response>
 */
function login(User $user, string $password = 'password', bool $remember = false): TestResponse
{
    return spa('POST', '/api/v1/auth/login', ['login' => $user->phone, 'password' => $password, 'remember' => $remember]);
}

/** Utilisateur affecté à $school (toute l'école, ou un cycle) et connecté par session. */
function actingAsRole(Role|string $role, School $school, ?Cycle $cycle = null): User
{
    $user = makeUser();
    assignRole($user, $school, $role, $cycle);
    login($user)->assertOk();

    return $user;
}

/**
 * Rôle personnalisé créé dans une école (sa clé d'affectation est son identifiant).
 *
 * @param  list<string>  $permissions
 */
function customRole(School $school, array $permissions, string $name = 'Surveillant général'): SchoolRole
{
    return inSchool($school, static fn (): SchoolRole => SchoolRole::factory()->createOne([
        'name' => $name,
        'permissions' => $permissions,
    ]));
}

/** Cycle d'une école à partir de son code de catalogue (lu dans le contexte de l'école). */
function cycleOf(School $school, string $code): Cycle
{
    return inSchool($school, static fn (): Cycle => Cycle::query()->where('code', $code)->firstOrFail());
}

/** Affecte un rôle à un utilisateur dans une école (toute l'école, ou un cycle) : rôle système ou clé d'un rôle personnalisé. */
function assignRole(User $user, School $school, Role|string $role = Role::Director, ?Cycle $cycle = null): RoleAssignment
{
    return inSchool($school, static fn (): RoleAssignment => RoleAssignment::factory()->createOne([
        'user_id' => $user->id,
        'role' => $role,
        'cycle_id' => $cycle?->id,
    ]));
}

function levelOf(School $school, string $code): Level
{
    return inSchool($school, static fn (): Level => Level::query()->where('code', $code)->firstOrFail());
}

function currentYearOf(School $school): AcademicYear
{
    return inSchool($school, static fn (): AcademicYear => AcademicYear::query()->where('is_current', true)->first()
        ?? AcademicYear::factory()->createOne());
}

/**
 * Classe de l'année en cours.
 *
 * @param  array<string, mixed>  $attributes
 */
function classroomOf(School $school, string $levelCode, string $section = 'A', array $attributes = []): Classroom
{
    $year = currentYearOf($school);
    $level = levelOf($school, $levelCode);

    return inSchool($school, static fn (): Classroom => Classroom::factory()->createOne([
        'academic_year_id' => $year->id,
        'level_id' => $level->id,
        'section' => $section,
        ...$attributes,
    ]));
}

/**
 * Élève inscrit dans une classe par l'Action d'inscription (matricule, tuteur payeur et contact principal).
 *
 * @param  array<string, mixed>  $overrides  first_name, last_name, gender, birth_date, guardian_phone, guardian_name,
 *                                           allergies, blood_type
 */
function enrollStudent(School $school, Classroom $classroom, array $overrides = []): Student
{
    $text = static fn (string $key, string $default): string => is_string($overrides[$key] ?? null) ? $overrides[$key] : $default;
    $nullable = static fn (string $key): ?string => is_string($overrides[$key] ?? null) ? $overrides[$key] : null;

    return inSchool($school, static fn (): Student => app(EnrollStudent::class)->handle($school, new NewEnrollment(
        firstName: $text('first_name', 'Awa'),
        lastName: $text('last_name', 'Koné'),
        gender: Gender::from($text('gender', 'F')),
        birthDate: $text('birth_date', '2019-03-14'),
        birthPlace: null,
        address: null,
        bloodType: null,
        allergies: $nullable('allergies'),
        medicalNotes: null,
        classroom: $classroom->load(['level', 'academicYear']),
        enrolledOn: '2026-09-07',
        guardians: [new GuardianInput(
            name: $text('guardian_name', 'Mariam Koné'),
            phone: $text('guardian_phone', '+2250701020304'),
            email: null,
            profession: null,
            relation: GuardianRelation::Mother,
            isPrimaryContact: true,
            isPayer: true,
            canPickUp: true,
        )],
    )));
}
