<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Tenancy\Models\Organization;
use App\Support\Tenancy\Platform;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Écrit par la connexion super-admin (aucune politique INSERT pour app_user), puis le modèle renvoyé
 * est rebasculé sur la connexion applicative : la suite du test reste soumise à la RLS.
 *
 * @extends Factory<Organization>
 */
final class OrganizationFactory extends Factory
{
    protected $model = Organization::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return ['name' => 'Groupe scolaire '.fake()->unique()->lastName()];
    }

    public function configure(): self
    {
        return $this->connection(Platform::CONNECTION)
            ->afterCreating(static function (Organization $organization): void {
                $organization->setConnection(TenantContext::CONNECTION);
            });
    }
}
