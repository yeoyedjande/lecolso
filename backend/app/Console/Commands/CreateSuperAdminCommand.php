<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Domains\Identity\Actions\CreateSuperAdmin;
use App\Support\Http\BusinessConflict;
use App\Support\Phone\Phone;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Premier super-administrateur d'une base vide (production) : à lancer une fois, à la main, par
 * `railway ssh --service api` puis `php artisan platform:create-super-admin` (docs/deploiement-railway.md).
 *
 * Le mot de passe n'est jamais un argument ni une option (il resterait dans l'historique du terminal et la liste
 * des processus) : il est saisi masqué, deux fois, et jamais affiché ni journalisé. Sans terminal interactif, la
 * commande refuse. Nom, téléphone et e-mail peuvent être passés en options ou saisis. Aucune donnée de démo.
 */
final class CreateSuperAdminCommand extends Command
{
    protected $signature = 'platform:create-super-admin
        {--name= : Nom affiché du super-administrateur}
        {--phone= : Téléphone (identifiant de connexion), ex. 0701020304 ou +2250701020304}
        {--email= : E-mail (facultatif, autre identifiant de connexion)}';

    protected $description = 'Crée le premier super-administrateur (mot de passe saisi masqué, jamais en argument)';

    public function handle(CreateSuperAdmin $create): int
    {
        if (! $this->input->isInteractive()) {
            $this->error('Commande interactive : le mot de passe se saisit au clavier, jamais en argument. Relancez-la dans un terminal (railway ssh).');

            return self::FAILURE;
        }

        $name = trim($this->optionText('name') ?? self::text($this->ask('Nom affiché')));
        $phoneInput = trim($this->optionText('phone') ?? self::text($this->ask('Téléphone (identifiant de connexion)')));
        $emailInput = trim($this->optionText('email') ?? self::text($this->ask('E-mail (facultatif, Entrée pour passer)', '')));
        $password = self::text($this->secret('Mot de passe (12 caractères au moins, majuscules, minuscules et chiffres)'));
        $confirmation = self::text($this->secret('Confirmez le mot de passe'));

        $phone = Phone::normalize($phoneInput);
        $email = $emailInput === '' ? null : mb_strtolower($emailInput);
        $errors = self::errors($name, $phone, $email, $password, $confirmation);
        if ($errors !== [] || $phone === null) {
            foreach ($errors as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        try {
            $user = $create->handle($name, $phone, $email, $password);
        } catch (BusinessConflict $conflict) {
            $this->error($conflict->getMessage());

            return self::FAILURE;
        }

        // Ni mot de passe, ni téléphone, ni e-mail dans le journal : l'identifiant du compte suffit
        Log::info('platform.super_admin_created', ['user_id' => $user->id]);
        $this->info(sprintf('Super-administrateur créé : %s (%s). Connectez-vous sur /connexion avec ce téléphone.', $name, Phone::mask($phone)));

        return self::SUCCESS;
    }

    private static function text(mixed $answer): string
    {
        return is_string($answer) ? $answer : '';
    }

    private function optionText(string $name): ?string
    {
        $value = $this->option($name);

        return is_string($value) && trim($value) !== '' ? $value : null;
    }

    /**
     * Messages d'erreur, en français (aucun n'affiche le mot de passe).
     *
     * @return list<string>
     */
    private static function errors(string $name, ?string $phone, ?string $email, string $password, string $confirmation): array
    {
        $errors = [];
        if (mb_strlen($name) < 2 || mb_strlen($name) > 120) {
            $errors[] = 'Nom affiché : 2 à 120 caractères.';
        }
        if ($phone === null) {
            $errors[] = 'Numéro de téléphone invalide.';
        }
        if ($email !== null && (filter_var($email, FILTER_VALIDATE_EMAIL) === false || mb_strlen($email) > 255)) {
            $errors[] = 'Adresse e-mail invalide.';
        }
        if (mb_strlen($password) < 12 || mb_strlen($password) > 255) {
            $errors[] = 'Le mot de passe doit contenir au moins 12 caractères.';
        }
        if (preg_match('/\p{Lu}/u', $password) !== 1 || preg_match('/\p{Ll}/u', $password) !== 1) {
            $errors[] = 'Le mot de passe doit contenir au moins une majuscule et une minuscule.';
        }
        if (preg_match('/\d/', $password) !== 1) {
            $errors[] = 'Le mot de passe doit contenir au moins un chiffre.';
        }
        if (! hash_equals($password, $confirmation)) {
            $errors[] = 'La confirmation ne correspond pas au mot de passe.';
        }
        if ($phone !== null && str_contains($password, substr($phone, -10))) {
            $errors[] = 'Le mot de passe ne doit pas contenir le numéro de téléphone.';
        }

        return $errors;
    }
}
