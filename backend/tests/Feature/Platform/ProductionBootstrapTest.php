<?php

declare(strict_types=1);

use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\Platform;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\PendingCommand;

use function Pest\Laravel\artisan;

/**
 * Répétition du démarrage d'une production : base migrée sans aucune donnée (ni DemoSeeder, ni compte), puis le
 * parcours réel de mise en service, par l'API comme le ferait le navigateur.
 */
it('met en service une base vide : premier super-admin, première école, son directeur', function (): void {
    $owner = DB::connection('pgsql_owner');
    expect($owner->table('users')->count())->toBe(0)
        ->and($owner->table('schools')->count())->toBe(0);

    // 1. Premier super-administrateur, par la commande (mot de passe saisi masqué)
    attachTerminal();
    $command = artisan('platform:create-super-admin', ['--name' => 'Yeo Admin', '--phone' => '0701020304', '--email' => 'admin@ekalewa.com']);
    if (! $command instanceof PendingCommand) {
        throw new LogicException('Commande attendue.');
    }
    $command
        ->expectsQuestion('Mot de passe (12 caractères au moins, majuscules, minuscules et chiffres)', 'Ekalewa-Prod-2026')
        ->expectsQuestion('Confirmez le mot de passe', 'Ekalewa-Prod-2026')
        ->assertSuccessful()
        ->run();

    // 2. Connexion du super-admin (téléphone, puis e-mail) et accès à la plateforme
    spa('POST', '/api/v1/auth/login', ['login' => '07 01 02 03 04', 'password' => 'mauvais'])->assertUnprocessable();
    spa('POST', '/api/v1/auth/login', ['login' => '0701020304', 'password' => 'Ekalewa-Prod-2026'])->assertOk();
    spa('GET', '/api/v1/me')->assertOk()
        ->assertJsonPath('data.is_super_admin', true)
        ->assertJsonPath('data.must_change_password', false)
        ->assertJsonPath('data.schools', []);
    spa('GET', '/api/v1/platform/schools')->assertOk()->assertJsonCount(0, 'data');

    // 3. Première école et son directeur (mot de passe provisoire remis une seule fois)
    $created = spa('POST', '/api/v1/platform/schools', [
        'name' => 'École Les Flamboyants',
        'slug' => 'les-flamboyants',
        'city' => 'Bouaké',
        'cycles' => ['kindergarten', 'primary'],
        'director' => ['name' => 'Adjoua Koffi', 'phone' => '07 11 22 33 44', 'email' => 'direction@flamboyants.ci'],
    ])->assertCreated();
    $schoolId = $created->json('data.id');
    $provisional = $created->json('director.provisional_password');
    expect($schoolId)->toBeString()->and($provisional)->toBeString();
    spa('POST', '/api/v1/auth/logout')->assertNoContent();

    // 4. Le directeur se connecte, change son mot de passe provisoire, puis administre son école
    spa('POST', '/api/v1/auth/login', ['login' => 'direction@flamboyants.ci', 'password' => $provisional])->assertOk();
    spa('GET', '/api/v1/me')->assertOk()->assertJsonPath('data.must_change_password', true);
    spa('POST', '/api/v1/auth/password', [
        'current_password' => $provisional,
        'password' => 'Flamboyants-2026',
        'password_confirmation' => 'Flamboyants-2026',
    ])->assertNoContent();
    $me = spa('GET', '/api/v1/me')->assertOk()
        ->assertJsonPath('data.is_super_admin', false)
        ->assertJsonPath('data.schools.0.slug', 'les-flamboyants');
    expect($me->collect('data.schools.0.roles')->pluck('role')->all())->toBe(['director']);
    $school = Platform::run(static fn (): School => School::query()->whereKey($schoolId)->firstOrFail());
    spa('GET', '/api/v1/cycles', [], $school)->assertOk()->assertJsonCount(2, 'data');
    // Le directeur n'a pas accès à la plateforme
    spa('GET', '/api/v1/platform/schools')->assertNotFound();

    // 5. Aucune donnée de démonstration n'a été créée en chemin
    expect($owner->table('users')->count())->toBe(2)
        ->and($owner->table('students')->count())->toBe(0)
        ->and($owner->table('users')->where('phone', 'like', '+22507000000%')->count())->toBe(0);
});
