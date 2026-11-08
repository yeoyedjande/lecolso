<?php

declare(strict_types=1);

namespace App\Domains\Identity\Actions;

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Authorization\RoleCatalog;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Models\School;
use Illuminate\Validation\ValidationException;

/**
 * Permissions qu'un utilisateur veut mettre dans un rôle du personnel :
 * - connues du catalogue, et jamais réservées aux parents ;
 * - pas d'élévation : chaque permission ajoutée doit être détenue par l'acteur sur toute l'école.
 * Renvoie la liste dédoublonnée, dans l'ordre du catalogue.
 */
final readonly class ValidateRolePermissions
{
    public function __construct(
        private RoleCatalog $catalog,
        private Authorizer $authorizer,
    ) {}

    /**
     * @param  list<string>  $permissions  permissions demandées
     * @param  list<string>  $current  permissions actuelles du rôle (non concernées par la règle d'élévation)
     * @return list<string>
     */
    public function handle(User $actor, School $school, array $permissions, array $current = []): array
    {
        $known = $this->catalog->permissions();
        $errors = [];

        foreach (array_values(array_unique($permissions)) as $index => $permission) {
            if (! in_array($permission, $known, true)) {
                $errors["permissions.{$index}"] = "Permission inconnue : {$permission}.";
            } elseif ($this->catalog->isGuardianOnly($permission)) {
                $errors["permissions.{$index}"] = 'Cette permission est réservée aux parents.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $held = $this->authorizer->permissionsFor($actor, $school);
        $added = array_diff($permissions, $current);
        $notHeld = array_values(array_filter(
            $added,
            static fn (string $permission): bool => ! array_key_exists($permission, $held) || $held[$permission] !== null,
        ));

        if ($notHeld !== []) {
            throw ValidationException::withMessages([
                'permissions' => 'Vous ne pouvez accorder que des permissions que vous détenez vous-même sur toute l’école : '
                    .implode(', ', $notHeld).'.',
            ]);
        }

        return array_values(array_filter($known, static fn (string $permission): bool => in_array($permission, $permissions, true)));
    }
}
