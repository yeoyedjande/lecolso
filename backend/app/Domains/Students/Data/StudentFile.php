<?php

declare(strict_types=1);

namespace App\Domains\Students\Data;

use App\Domains\Students\Models\Student;
use Illuminate\Support\Collection;

/** Dossier d'un élève tel que l'utilisateur courant peut le voir. */
final readonly class StudentFile
{
    /**
     * @param  Collection<int, Student>  $siblings  frères et sœurs (tuteur commun) visibles par l'utilisateur
     */
    public function __construct(
        public Student $student,
        public bool $canManage,
        public bool $canViewMedical,
        public Collection $siblings,
    ) {}
}
