<?php

declare(strict_types=1);

namespace App\Domains\Grading\Data;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Models\Subject;
use App\Domains\Grading\Models\Term;
use App\Domains\Students\Models\Student;
use Illuminate\Database\Eloquent\Collection;

/** Résultats d'une classe pour une période, avec les élèves et les matières. */
final readonly class ClassResultsView
{
    /**
     * @param  Collection<int, Term>  $terms
     * @param  Collection<int, Subject>  $subjects
     * @param  Collection<int, Student>  $students
     */
    public function __construct(
        public Classroom $classroom,
        public Collection $terms,
        public Term $term,
        public Collection $subjects,
        public Collection $students,
        public ClassResults $results,
    ) {}
}
