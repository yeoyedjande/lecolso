<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\AcademicYear;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Année 2026-2027 en cours (à créer dans le contexte d'une école).
 *
 * @extends Factory<AcademicYear>
 */
final class AcademicYearFactory extends Factory
{
    protected $model = AcademicYear::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'label' => '2026-2027',
            'starts_on' => '2026-09-14',
            'ends_on' => '2027-07-02',
            'status' => AcademicYearStatus::Open,
            'is_current' => true,
        ];
    }
}
