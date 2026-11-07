<?php

declare(strict_types=1);

use App\Domains\Identity\Models\User;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\PendingCommand;

use function Pest\Laravel\artisan;

const SUPER_ADMIN_PASSWORD = 'Ekalewa-Prod-2026';

/** Exécution de la commande avec les réponses saisies au clavier. */
function createSuperAdmin(string $password = SUPER_ADMIN_PASSWORD, ?string $confirmation = null, string $phone = '07 01 02 03 04', string $email = 'Admin@Ekalewa.com'): PendingCommand
{
    $command = artisan('platform:create-super-admin');
    if (! $command instanceof PendingCommand) {
        throw new LogicException('Commande attendue.');
    }

    return $command
        ->expectsQuestion('Nom affiché', 'Yeo Admin')
        ->expectsQuestion('Téléphone (identifiant de connexion)', $phone)
        ->expectsQuestion('E-mail (facultatif, Entrée pour passer)', $email)
        ->expectsQuestion('Mot de passe (12 caractères au moins, majuscules, minuscules et chiffres)', $password)
        ->expectsQuestion('Confirmez le mot de passe', $confirmation ?? $password);
}

/**
 * Super-administrateurs en base (lecture par le rôle propriétaire).
 *
 * @return list<array{phone: string, email: string|null, must_change_password: bool, password: string}>
 */
function superAdmins(): array
{
    $rows = [];
    foreach (DB::connection('pgsql_owner')->table('users')->where('is_super_admin', true)->get(['phone', 'email', 'must_change_password', 'password']) as $row) {
        $values = (array) $row;
        $rows[] = [
            'phone' => is_string($values['phone'] ?? null) ? $values['phone'] : '',
            'email' => is_string($values['email'] ?? null) ? $values['email'] : null,
            'must_change_password' => ($values['must_change_password'] ?? null) === true,
            'password' => is_string($values['password'] ?? null) ? $values['password'] : '',
        ];
    }

    return $rows;
}

it('crée le premier super-administrateur, mot de passe haché et jamais journalisé', function (): void {
    $logged = [];
    Event::listen(MessageLogged::class, static function (MessageLogged $entry) use (&$logged): void {
        $logged[] = ['message' => $entry->message, 'context' => $entry->context];
    });

    createSuperAdmin()
        ->expectsOutputToContain('Super-administrateur créé : Yeo Admin (+225********04)')
        ->assertSuccessful();

    $rows = superAdmins();
    expect($rows)->toHaveCount(1);
    $row = $rows[0] ?? throw new LogicException('Super-administrateur attendu.');
    expect($row['phone'])->toBe('+2250701020304')
        ->and($row['email'])->toBe('admin@ekalewa.com')
        ->and($row['must_change_password'])->toBeFalse()
        ->and($row['password'])->not->toBe(SUPER_ADMIN_PASSWORD)
        ->and(Hash::check(SUPER_ADMIN_PASSWORD, $row['password']))->toBeTrue();

    // Une seule entrée, identifiant du compte seulement : ni mot de passe, ni téléphone, ni e-mail
    $entries = array_values(array_filter($logged, static fn (array $entry): bool => $entry['message'] === 'platform.super_admin_created'));
    expect($entries)->toHaveCount(1)
        ->and(array_keys($entries[0]['context'] ?? []))->toBe(['user_id']);
    $all = (string) json_encode($logged);
    foreach ([SUPER_ADMIN_PASSWORD, '0701020304', 'admin@ekalewa.com'] as $secret) {
        expect(str_contains($all, $secret))->toBeFalse();
    }
});

it('refuse un second super-administrateur, un téléphone ou un e-mail déjà pris', function (): void {
    createSuperAdmin()->assertSuccessful();
    createSuperAdmin(phone: '0505050505', email: 'autre@ekalewa.com')
        ->expectsOutputToContain('Un super-administrateur existe déjà')
        ->assertFailed();
    expect(superAdmins())->toHaveCount(1);

    DB::connection('pgsql_owner')->table('users')->update(['is_super_admin' => false]);
    createSuperAdmin(email: 'autre@ekalewa.com')->expectsOutputToContain('Ce numéro de téléphone appartient déjà à un compte')->assertFailed();
    createSuperAdmin(phone: '0505050505', email: 'ADMIN@ekalewa.com')->expectsOutputToContain('Cette adresse e-mail appartient déjà à un compte')->assertFailed();
    expect(superAdmins())->toHaveCount(0);
});

it('valide le mot de passe et les informations', function (string $password, ?string $confirmation, string $phone, string $message): void {
    createSuperAdmin($password, $confirmation, $phone)->expectsOutputToContain($message)->assertFailed();
    expect(superAdmins())->toBe([]);
})->with([
    'trop court' => ['Court-2026', null, '0701020304', 'au moins 12'],
    'sans majuscule' => ['ekalewa-prod-2026', null, '0701020304', 'majuscule'],
    'sans chiffre' => ['Ekalewa-Production', null, '0701020304', 'chiffre'],
    'confirmation différente' => [SUPER_ADMIN_PASSWORD, 'Ekalewa-Prod-2027', '0701020304', 'La confirmation ne correspond pas'],
    'téléphone invalide' => [SUPER_ADMIN_PASSWORD, null, '1234', 'Numéro de téléphone invalide'],
    'téléphone dans le mot de passe' => ['Abc2250701020304', null, '0701020304', 'ne doit pas contenir le numéro'],
]);

it('refuse de s’exécuter sans terminal interactif (aucun mot de passe en argument)', function (): void {
    $command = artisan('platform:create-super-admin', ['--name' => 'Yeo', '--phone' => '0701020304', '--no-interaction' => true]);
    if (! $command instanceof PendingCommand) {
        throw new LogicException('Commande attendue.');
    }
    $command->expectsOutputToContain('Commande interactive')->assertFailed();
    expect(superAdmins())->toBe([]);
    expect(User::query()->getModel()->getFillable())->not->toContain('is_super_admin');
});
