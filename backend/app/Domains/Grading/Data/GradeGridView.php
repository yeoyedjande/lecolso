<?php

declare(strict_types=1);

namespace App\Domains\Grading\Data;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Models\Grade;
use App\Domains\Grading\Models\Subject;
use App\Domains\Grading\Models\Term;
use App\Domains\Students\Models\Student;
use Illuminate\Database\Eloquent\Collection;

/** Grille de notes d'une classe pour une période et une matière : évaluations en colonnes, élèves en lignes. */
final readonly class GradeGridView
{
    /**
     * @param  Collection<int, Term>  $terms
     * @param  Collection<int, Subject>  $subjects
     * @param  Collection<int, Assessment>  $assessments
     * @param  list<array{student: Student, grades: array<string, Grade>, average: float|null}>  $rows
     */
    public function __construct(
        public Classroom $classroom,
        public Collection $terms,
        public Term $term,
        public Collection $subjects,
        public ?Subject $subject,
        public Collection $assessments,
        public array $rows,
        public bool $canManage,
        public bool $closed = false,
    ) {}
}
