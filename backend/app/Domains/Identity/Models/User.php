<?php

declare(strict_types=1);

namespace App\Domains\Identity\Models;

use App\Domains\Identity\Enums\Role;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * Utilisateur de la plateforme (personnel ou parent), commun à toutes ses écoles.
 *
 * Table protégée par la RLS : visible pour l'utilisateur lui-même et pour les membres de l'école courante.
 * Connexion : identifiant (téléphone E.164 ou e-mail) + mot de passe ; un compte créé par le personnel
 * porte un mot de passe provisoire à changer à la première connexion (must_change_password).
 *
 * @property string $id
 * @property string $name
 * @property string $phone
 * @property string|null $email
 * @property string $password
 * @property bool $must_change_password
 * @property bool $is_super_admin
 * @property Carbon|null $last_login_at
 */
final class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    /**
     * is_super_admin et must_change_password ne sont jamais assignables en masse.
     *
     * @var list<string>
     */
    protected $fillable = ['name', 'phone', 'email', 'password'];

    /** @var list<string> */
    protected $hidden = ['password', 'remember_token'];

    /**
     * Affectations visibles selon la RLS : celles de l'école courante et celles de l'utilisateur courant.
     *
     * @return HasMany<RoleAssignment, $this>
     */
    public function roleAssignments(): HasMany
    {
        return $this->hasMany(RoleAssignment::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->is_super_admin === true;
    }

    /**
     * « Se souvenir de moi » (30 jours) : uniquement pour les comptes sans rôle du personnel.
     * Lit ses propres affectations (contexte app.user_id posé par le fournisseur d'utilisateurs).
     */
    public function canBeRemembered(): bool
    {
        if ($this->isSuperAdmin()) {
            return false;
        }

        return ! RoleAssignment::ofUser($this)
            ->where('role', '!=', Role::Guardian->value)
            ->exists();
    }

    protected static function newFactory(): UserFactory
    {
        return UserFactory::new();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'is_super_admin' => 'boolean',
        ];
    }
}
