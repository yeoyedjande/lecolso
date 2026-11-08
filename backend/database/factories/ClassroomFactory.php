<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Academic\Models\Classroom;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Classe (à créer dans le contexte d'une école, avec academic_year_id et level_id).
 *
 * @extends Factory<Classroom>
 */
final class ClassroomFactory extends Factory
{
    protected $model = Classroom::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'section' => 'A',
            'capacity' => 30,
            'room' => null,
            'homeroom_teacher_id' => null,
        ];
    }
}
