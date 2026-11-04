<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Academic\Models\Level;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * À créer dans le contexte d'une école (TenantContext::run ou helper de test inSchool()).
 *
 * @extends Factory<Level>
 */
final class LevelFactory extends Factory
{
    protected $model = Level::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'cycle_id' => Cycle::factory(),
            'code' => 'N'.fake()->unique()->numerify('###'),
            'name' => 'Niveau '.fake()->word(),
            'position' => 0,
        ];
    }
}
