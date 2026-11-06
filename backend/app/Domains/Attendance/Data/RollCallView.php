<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Data;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Models\RollCall;
use App\Domains\Students\Models\Student;

/**
 * Appel d'une classe pour un jour : élèves inscrits ce jour-là avec leur statut (présent si aucune marque), appel
 * enregistré ou non, droits (modifier, motif exigé car la journée est passée).
 */
final readonly class RollCallView
{
    /**
     * @param  list<array{student: Student, mark: AttendanceMark|null}>  $rows
     */
    public function __construct(
        public Classroom $classroom,
        public string $date,
        public ?RollCall $rollCall,
        public array $rows,
        public bool $canEdit,
        public bool $needsReason,
    ) {}
}
