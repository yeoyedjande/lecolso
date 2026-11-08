<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Identity\Models\SchoolRole;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Rôle personnalisé (à créer dans le contexte d'une école).
 *
 * @extends Factory<SchoolRole>
 */
final class SchoolRoleFactory extends Factory
{
    protected $model = SchoolRole::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'system_key' => null,
            'name' => 'Rôle '.fake()->unique()->numberBetween(1, 1_000_000),
            'description' => null,
            'permissions' => ['students.view'],
        ];
    }
}
