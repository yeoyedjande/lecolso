<?php

declare(strict_types=1);

namespace App\Domains\Family\Data;

use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Models\PlannedAbsence;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Support\InvoiceBalance;
use App\Domains\Grading\Enums\SkillLevel;
use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Models\Grade;
use App\Domains\Grading\Models\ReportCard;
use App\Domains\Grading\Models\Skill;
use App\Domains\Grading\Models\Subject;
use App\Domains\Grading\Models\Term;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use Illuminate\Database\Eloquent\Collection;

/**
 * Fiche d'un enfant dans l'espace parent : notes de la période au fil de l'eau (évaluations et moyenne de chaque
 * matière, jamais de moyenne générale ni de rang), compétences, bulletins validés, absences de l'année, absences annoncées par le parent, frais.
 */
final readonly class ChildView
{
    /**
     * @param  Collection<int, Term>  $terms
     * @param  list<array{subject: Subject, average: float|null, assessments: list<array{assessment: Assessment, grade: Grade|null}>}>  $subjects
     * @param  list<array{skill: Skill, level: SkillLevel|null}>  $skills
     * @param  list<array{card: ReportCard, term: Term}>  $reportCards
     * @param  Collection<int, AttendanceMark>  $marks
     * @param  Collection<int, Payment>  $payments
     * @param  Collection<int, PlannedAbsence>  $plannedAbsences
     */
    public function __construct(
        public Student $student,
        public ?Enrollment $enrollment,
        public string $assessmentMode,
        public int $gradeScale,
        public Collection $terms,
        public ?Term $term,
        public array $subjects,
        public array $skills,
        public array $reportCards,
        public Collection $marks,
        public ?InvoiceBalance $balance,
        public Collection $payments,
        public Collection $plannedAbsences,
    ) {}
}
