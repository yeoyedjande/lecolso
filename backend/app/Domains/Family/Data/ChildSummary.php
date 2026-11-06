<?php

declare(strict_types=1);

namespace App\Domains\Family\Data;

use App\Domains\Billing\Support\InvoiceBalance;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;

/** Un enfant à l'accueil de l'espace parent. `presence` : present, absent, late, ou null (appel pas encore fait). */
final readonly class ChildSummary
{
    public function __construct(
        public Student $student,
        public ?Enrollment $enrollment,
        public ?string $presence,
        public ?InvoiceBalance $balance,
        public int $absencesToJustify,
    ) {}
}
