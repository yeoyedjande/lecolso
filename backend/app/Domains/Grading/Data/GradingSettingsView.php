<?php

declare(strict_types=1);

namespace App\Domains\Grading\Data;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Academic\Models\Level;
use App\Domains\Grading\Models\Skill;
use App\Domains\Grading\Models\Subject;
use App\Domains\Grading\Models\Term;
use Illuminate\Database\Eloquent\Collection;

/** Réglages des notes d'un cycle pour une année : périodes, matières par niveau, référentiel de compétences. */
final readonly class GradingSettingsView
{
    /**
     * @param  Collection<int, Term>  $terms
     * @param  list<array{level: Level, subjects: Collection<int, Subject>}>  $levels
     * @param  Collection<int, Skill>  $skills
     * @param  array<string, true>  $used  identifiants de périodes, matières et compétences déjà utilisées
     */
    public function __construct(
        public Cycle $cycle,
        public AcademicYear $year,
        public Collection $terms,
        public array $levels,
        public Collection $skills,
        public array $used,
        public bool $canManage,
    ) {}
}
