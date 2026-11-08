<?php

declare(strict_types=1);

namespace App\Domains\Grading\Data;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Enums\Mention;
use App\Domains\Grading\Models\Appreciation;
use App\Domains\Grading\Models\ReportCard;
use App\Domains\Grading\Models\Subject;
use App\Domains\Grading\Models\Term;
use App\Domains\Grading\Models\TermClosure;
use App\Domains\Students\Models\Student;
use Illuminate\Database\Eloquent\Collection;

/** Bulletins d'une classe pour une période : résultats, appréciations, mentions, validation et PDF. */
final readonly class ReportCardsView
{
    /**
     * @param  Collection<int, Term>  $terms
     * @param  Collection<int, Subject>  $subjects
     * @param  Collection<int, Student>  $students
     * @param  array<string, Appreciation>  $appreciations  élève → appréciations
     * @param  array<string, array<string, string>>  $subjectComments  élève → matière → appréciation
     * @param  array<string, Mention|null>  $proposed  élève → mention proposée d'après la moyenne
     * @param  array<string, ReportCard>  $reportCards  élève → bulletin de la validation en cours
     * @param  Collection<int, TermClosure>  $history  validations, la plus récente d'abord
     * @param  array{congratulations: float, honor_roll: float, encouragement: float, warning_below: float}  $thresholds
     */
    public function __construct(
        public Classroom $classroom,
        public Collection $terms,
        public Term $term,
        public Collection $subjects,
        public Collection $students,
        public ClassResults $results,
        public array $appreciations,
        public array $subjectComments,
        public array $proposed,
        public ?TermClosure $closure,
        public array $reportCards,
        public Collection $history,
        public array $thresholds,
        public bool $canComment,
        public bool $canValidate,
    ) {}
}
