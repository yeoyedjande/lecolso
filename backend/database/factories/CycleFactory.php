<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Academic\Models\Cycle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * À créer dans le contexte d'une école (TenantContext::run ou helper de test inSchool()).
 * Pour un catalogue complet : School::factory()->withCycles().
 *
 * @extends Factory<Cycle>
 */
final class CycleFactory extends Factory
{
    protected $model = Cycle::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => 'cycle-'.fake()->unique()->numerify('####'),
            'name' => 'Cycle '.fake()->word(),
            'position' => 0,
            'settings' => [
                'term_type' => 'trimester',
                'assessment_mode' => 'weighted_average',
                'attendance_mode' => 'roll_call',
                'billing_period' => 'quarterly',
                'report_document' => 'report_card',
                'daily_log' => 'none',
            ],
        ];
    }
}
