<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Academic\Actions\ProvisionCycles;
use App\Domains\Tenancy\Enums\SchoolType;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\Platform;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * Les écoles s'écrivent par la connexion super-admin (aucune politique INSERT pour app_user),
 * puis le modèle renvoyé est rebasculé sur la connexion applicative : la suite du test reste soumise à la RLS.
 *
 * @extends Factory<School>
 */
final class SchoolFactory extends Factory
{
    protected $model = School::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = 'École '.fake()->unique()->lastName();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)),
            'type' => SchoolType::PreschoolPrimary,
            'city' => 'Abidjan',
            'currency' => 'XOF',
        ];
    }

    public function configure(): self
    {
        // Premier callback : les suivants (withCycles) s'exécutent déjà sur la connexion applicative
        return $this->connection(Platform::CONNECTION)
            ->afterCreating(static function (School $school): void {
                $school->setConnection(TenantContext::CONNECTION);
            });
    }

    /**
     * Ouvre des cycles du catalogue (config/cycles.php) avec leurs niveaux.
     *
     * @param  list<string>|null  $codes  null = garderie, maternelle et primaire
     */
    public function withCycles(?array $codes = null): self
    {
        return $this->afterCreating(static function (School $school) use ($codes): void {
            app(ProvisionCycles::class)->handle($school, $codes);
        });
    }
}
