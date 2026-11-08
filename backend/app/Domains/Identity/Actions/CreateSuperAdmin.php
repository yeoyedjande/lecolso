<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use App\Support\Tenancy\Platform;
use Illuminate\Support\Facades\DB;

/**
 * Création du premier super-administrateur, sur une base de production vide (commande
 * `platform:create-super-admin`, lancée à la main par Railway SSH). Écriture hors école par Platform::run() : la RLS
 * de `users` ne laisse créer aucun compte sans école, et `is_super_admin` n'est jamais assignable en masse.
 * Refus si un super-admin existe déjà (les suivants se créent autrement, pas par cette porte d'entrée), ou si le
 * téléphone ou l'e-mail appartient déjà à un compte. Verrou consultatif : deux exécutions simultanées n'en créent
 * qu'un. Mot de passe reçu en clair et haché par le modèle, jamais journalisé.
 */
final class CreateSuperAdmin
{
    /**
     * @throws BusinessConflict super_admin_exists, phone_taken, email_taken
     */
    public function handle(string $name, string $phone, ?string $email, string $password): User
    {
        return Platform::run(static function () use ($name, $phone, $email, $password): User {
            // SQL brut justifié : verrou consultatif de transaction, aucune table lue
            DB::select('SELECT pg_advisory_xact_lock(hashtext(?))', ['platform:create-super-admin']);

            if (User::query()->where('is_super_admin', true)->exists()) {
                throw new BusinessConflict('super_admin_exists', 'Un super-administrateur existe déjà : cette commande ne sert qu’à créer le premier.');
            }
            if (User::query()->where('phone', $phone)->exists()) {
                throw new BusinessConflict('phone_taken', 'Ce numéro de téléphone appartient déjà à un compte.');
            }
            if ($email !== null && User::query()->whereRaw('lower(email) = ?', [mb_strtolower($email)])->exists()) {
                throw new BusinessConflict('email_taken', 'Cette adresse e-mail appartient déjà à un compte.');
            }

            $user = new User(['name' => $name, 'phone' => $phone, 'email' => $email, 'password' => $password]);
            $user->forceFill(['is_super_admin' => true, 'must_change_password' => false])->save();

            return $user;
        });
    }
}
