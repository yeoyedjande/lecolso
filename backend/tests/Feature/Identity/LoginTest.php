<?php

declare(strict_types=1);

use App\Domains\Identity\Actions\AttemptLogin;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use Illuminate\Cookie\CookieValuePrefix;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Timebox;
use Tests\Support\InstantTimebox;
use Tests\Support\SpaClient;

it('connecte par téléphone, quelle que soit la saisie, ou par e-mail', function (string $login): void {
    $user = User::factory()->createOne(['phone' => '+2250701020304', 'email' => 'awa.kone@example.ci']);
    assignRole($user, makeSchool(), Role::Secretary);

    spa('POST', '/api/v1/auth/login', ['login' => $login, 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.phone', '+2250701020304')
        ->assertJsonCount(1, 'data.schools');

    spa('GET', '/api/v1/me')->assertOk()->assertJsonPath('data.id', $user->id);
})->with([
    'E.164' => ['+2250701020304'],
    'national avec espaces' => ['07 01 02 03 04'],
    'national compact' => ['0701020304'],
    'préfixe 00' => ['00225 07 01 02 03 04'],
    'e-mail' => ['awa.kone@example.ci'],
    'e-mail en majuscules' => [' Awa.Kone@Example.CI '],
]);

it('enregistre la date de dernière connexion', function (): void {
    $user = makeUser();
    assignRole($user, makeSchool(), Role::Teacher);

    login($user)->assertOk();

    expect(inSchool(makeSchool(), static fn (): mixed => null))->toBeNull();
    $lastLogin = DB::connection('pgsql_owner')->scalar('select last_login_at from users where id = ?', [$user->id]);
    expect($lastLogin)->not->toBeNull();
});

it('donne la même réponse que le compte existe ou non, ou que le mot de passe soit faux', function (): void {
    $user = makeUser();

    $wrongPassword = spa('POST', '/api/v1/auth/login', ['login' => $user->phone, 'password' => 'mauvais']);
    $unknownAccount = spa('POST', '/api/v1/auth/login', ['login' => '+2250599999999', 'password' => 'mauvais']);
    $unknownEmail = spa('POST', '/api/v1/auth/login', ['login' => 'personne@example.ci', 'password' => 'mauvais']);
    $notAPhone = spa('POST', '/api/v1/auth/login', ['login' => 'nimporte quoi', 'password' => 'mauvais']);

    foreach ([$wrongPassword, $unknownAccount, $unknownEmail, $notAPhone] as $response) {
        $response->assertUnprocessable()->assertExactJson([
            'message' => AttemptLogin::FAILED_MESSAGE,
            'errors' => ['login' => [AttemptLogin::FAILED_MESSAGE]],
        ]);
    }

    // Chaque tentative, réussie ou non, passe par la même durée minimale
    $timebox = app(Timebox::class);
    expect($timebox)->toBeInstanceOf(InstantTimebox::class);
    \assert($timebox instanceof InstantTimebox);
    expect($timebox->durations)->toBe(array_fill(0, 4, AttemptLogin::MINIMUM_DURATION));
});

it('prend au moins la durée minimale, que le compte existe ou non (vraie Timebox)', function (): void {
    app()->instance(Timebox::class, new Timebox);
    $user = makeUser();

    $durations = [];
    foreach ([$user->phone, '+2250599999999'] as $login) {
        $start = hrtime(true);
        spa('POST', '/api/v1/auth/login', ['login' => $login, 'password' => 'mauvais'])->assertUnprocessable();
        $durations[] = (hrtime(true) - $start) / 1000;
    }

    expect($durations[0])->toBeGreaterThanOrEqual(AttemptLogin::MINIMUM_DURATION)
        ->and($durations[1])->toBeGreaterThanOrEqual(AttemptLogin::MINIMUM_DURATION);
});

it('limite à 5 tentatives par minute pour un même identifiant', function (): void {
    $user = makeUser();

    for ($i = 0; $i < 5; $i++) {
        spa('POST', '/api/v1/auth/login', ['login' => $user->phone, 'password' => 'mauvais'])->assertUnprocessable();
    }

    // Même identifiant saisi autrement, depuis une autre adresse IP : toujours bloqué
    spa('POST', '/api/v1/auth/login', ['login' => substr($user->phone, 4), 'password' => 'password'], null, ['REMOTE_ADDR' => '10.0.0.9'])
        ->assertTooManyRequests()
        ->assertHeader('Retry-After')
        ->assertJsonPath('code', 'too_many_attempts');
});

it('limite à 20 tentatives par minute depuis une même adresse IP', function (): void {
    for ($i = 0; $i < 20; $i++) {
        spa('POST', '/api/v1/auth/login', ['login' => '+22505000000'.str_pad((string) $i, 2, '0', STR_PAD_LEFT), 'password' => 'x'], null, ['REMOTE_ADDR' => '10.0.0.1'])
            ->assertUnprocessable();
    }

    spa('POST', '/api/v1/auth/login', ['login' => '+2250500000099', 'password' => 'x'], null, ['REMOTE_ADDR' => '10.0.0.1'])
        ->assertTooManyRequests();

    // Une autre adresse IP n'est pas concernée
    spa('POST', '/api/v1/auth/login', ['login' => '+2250500000099', 'password' => 'x'], null, ['REMOTE_ADDR' => '10.0.0.2'])
        ->assertUnprocessable();
});

/** Identifiant de session contenu dans le cookie chiffré. */
function sessionIdFromCookie(string $encrypted): string
{
    $decrypted = app('encrypter')->decrypt($encrypted, false);

    return is_string($decrypted) ? CookieValuePrefix::remove($decrypted) : '';
}

it('régénère l’identifiant de session à la connexion', function (): void {
    $user = makeUser();
    assignRole($user, makeSchool(), Role::Teacher);
    $cookieName = config()->string('session.cookie');

    spa('GET', '/sanctum/csrf-cookie')->assertNoContent();
    $before = sessionIdFromCookie(SpaClient::cookies()[$cookieName] ?? '');

    login($user)->assertOk();
    $after = sessionIdFromCookie(SpaClient::cookies()[$cookieName] ?? '');

    expect($before)->toHaveLength(40)
        ->and($after)->toHaveLength(40)
        ->and($after)->not->toBe($before);
});

it('invalide complètement la session à la déconnexion', function (): void {
    $user = makeUser();
    assignRole($user, makeSchool(), Role::Teacher);
    $cookieName = config()->string('session.cookie');

    login($user)->assertOk();
    $loggedInSession = SpaClient::cookies()[$cookieName] ?? '';

    spa('POST', '/api/v1/auth/logout')->assertNoContent();
    spa('GET', '/api/v1/me')->assertUnauthorized();

    // Rejouer l'ancien cookie de session ne reconnecte pas
    SpaClient::setCookie($cookieName, $loggedInSession);
    spa('GET', '/api/v1/me')->assertUnauthorized();
});

it('se souvient 30 jours d’un compte parent qui le demande, jamais d’un compte du personnel', function (): void {
    $school = makeSchool();
    $parent = makeUser();
    assignRole($parent, $school, Role::Guardian);
    $staff = makeUser();
    assignRole($staff, $school, Role::Director);

    login($parent, remember: true)->assertOk()->assertJsonPath('data.can_be_remembered', true);
    $rememberCookies = array_filter(array_keys(SpaClient::cookies()), static fn (string $name): bool => str_starts_with($name, 'remember_web_'));
    expect($rememberCookies)->toHaveCount(1);

    SpaClient::reset();
    login($staff, remember: true)->assertOk()->assertJsonPath('data.can_be_remembered', false);
    $rememberCookies = array_filter(array_keys(SpaClient::cookies()), static fn (string $name): bool => str_starts_with($name, 'remember_web_'));
    expect($rememberCookies)->toBe([]);
});

it('reconnecte un parent par son cookie « se souvenir de moi » après la fin de la session', function (): void {
    $parent = makeUser();
    assignRole($parent, makeSchool(), Role::Guardian);

    login($parent, remember: true)->assertOk();
    SpaClient::forgetCookie(config()->string('session.cookie'));

    spa('GET', '/api/v1/me')->assertOk()->assertJsonPath('data.id', $parent->id);
});

it('refuse une connexion sans session (requête hors du frontend)', function (): void {
    $user = makeUser();

    Pest\Laravel\postJson('/api/v1/auth/login', ['login' => $user->phone, 'password' => 'password'])
        ->assertBadRequest();
});

it('valide la requête de connexion', function (): void {
    spa('POST', '/api/v1/auth/login', [])->assertUnprocessable()->assertJsonValidationErrors(['login', 'password']);
});

it('répond 401 sur /me sans session', function (): void {
    spa('GET', '/api/v1/me')->assertUnauthorized();
});
