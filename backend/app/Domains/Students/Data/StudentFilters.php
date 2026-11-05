<?php

declare(strict_types=1);

namespace App\Domains\Students\Data;

use App\Domains\Students\Enums\EnrollmentStatus;

/** Filtres de la liste des élèves ; année null = année en cours, statut null = actifs et partis. */
final readonly class StudentFilters
{
    public function __construct(
        public ?string $academicYearId = null,
        public ?string $classroomId = null,
        public ?string $cycleId = null,
        public ?EnrollmentStatus $status = EnrollmentStatus::Active,
        public ?string $search = null,
    ) {}
}
