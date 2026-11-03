<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\RoleAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * À créer dans le contexte d'une école (TenantContext::run ou helper de test inSchool()).
 *
 * @extends Factory<RoleAssignment>
 */
final class RoleAssignmentFactory extends Factory
{
    protected $model = RoleAssignment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'role' => Role::Director,
            'cycle_id' => null,
        ];
    }
}
