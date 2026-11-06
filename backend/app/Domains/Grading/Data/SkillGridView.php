<?php

declare(strict_types=1);

namespace App\Domains\Grading\Data;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Models\Skill;
use App\Domains\Grading\Models\SkillEvaluation;
use App\Domains\Grading\Models\Term;
use App\Domains\Students\Models\Student;
use Illuminate\Database\Eloquent\Collection;

/** Grille des compétences d'une classe pour une période : compétences en colonnes, élèves en lignes. */
final readonly class SkillGridView
{
    /**
     * @param  Collection<int, Term>  $terms
     * @param  Collection<int, Skill>  $skills
     * @param  list<array{student: Student, levels: array<string, SkillEvaluation>}>  $rows
     */
    public function __construct(
        public Classroom $classroom,
        public Collection $terms,
        public Term $term,
        public Collection $skills,
        public array $rows,
        public bool $canManage,
    ) {}
}
