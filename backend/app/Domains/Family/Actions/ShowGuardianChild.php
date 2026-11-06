<?php

declare(strict_types=1);

namespace App\Domains\Family\Actions;

use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Models\PlannedAbsence;
use App\Domains\Billing\Contracts\PaymentGateway;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Support\FinancialPolicy;
use App\Domains\Billing\Support\InvoiceBalance;
use App\Domains\Family\Data\ChildView;
use App\Domains\Family\Support\GuardianChildren;
use App\Domains\Grading\Enums\ReportCardStatus;
use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Models\Grade;
use App\Domains\Grading\Models\ReportCard;
use App\Domains\Grading\Models\SkillEvaluation;
use App\Domains\Grading\Models\Term;
use App\Domains\Grading\Support\ClassroomGrading;
use App\Domains\Grading\Support\GradingCatalog;
use App\Domains\Grading\Support\GradingResults;
use App\Domains\Identity\Models\User;
use App\Support\Cycles\Enums\AssessmentMode;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Fiche d'un enfant (décision du 06/11/2026) : notes au fil de l'eau de la période (`termId`, celle du jour par
 * défaut) avec la moyenne de chaque matière, compétences, bulletins validés (PDF prêts), absences et retards de l'année
 * avec leur justification, situation de la facture et paiements. Un enfant dont il n'est pas tuteur : 404.
 */
final readonly class ShowGuardianChild
{
    public function __construct(
        private GuardianChildren $children,
        private ClassroomGrading $grading,
        private GradingCatalog $catalog,
        private GradingResults $results,
        private PaymentGateway $gateway,
        private TenantContext $context,
    ) {}

    public function handle(User $user, string $studentId, ?string $termId, Carbon $now): ChildView
    {
        $student = $this->children->query($user)->whereKey($studentId)->first() ?? throw new NotFoundHttpException;
        $enrollment = GuardianChildren::enrollment($student);
        $classroom = $enrollment?->classroom;
        $settings = $classroom?->level->cycle->settings;
        $mode = $settings === null ? AssessmentMode::Observation : $settings->assessmentMode;

        $terms = new Collection;
        $term = null;
        $subjects = [];
        $skills = [];
        if ($classroom !== null && $mode !== AssessmentMode::Observation) {
            $terms = $this->grading->terms($classroom);
            $term = $terms->isEmpty() ? null : $this->grading->pick($terms, $termId !== null && $terms->contains('id', $termId) ? $termId : null, $now);
        }
        if ($classroom !== null && $term !== null && $mode === AssessmentMode::WeightedAverage) {
            $subjectList = $this->catalog->subjects($classroom->academicYear, $classroom->level);
            $results = $this->results->compute($classroom, $term, new Collection([$student]), $subjectList)->for($student->id);
            $assessments = Assessment::query()->where('classroom_id', $classroom->id)->where('term_id', $term->id)->orderBy('date')->get()->groupBy('subject_id');
            $grades = Grade::query()->where('student_id', $student->id)->whereIn('assessment_id', Assessment::query()->where('classroom_id', $classroom->id)->where('term_id', $term->id)->select('id'))->get()->keyBy('assessment_id');
            foreach ($subjectList as $subject) {
                $rows = [];
                foreach ($assessments->get($subject->id) ?? [] as $assessment) {
                    $rows[] = ['assessment' => $assessment, 'grade' => $grades->get($assessment->id)];
                }
                $subjects[] = ['subject' => $subject, 'average' => $results?->subjects[$subject->id] ?? null, 'assessments' => $rows];
            }
        }
        if ($classroom !== null && $term !== null && $mode === AssessmentMode::Competency) {
            $levels = SkillEvaluation::query()->where('term_id', $term->id)->where('student_id', $student->id)->whereNotNull('level')->get()->keyBy('skill_id');
            foreach ($this->catalog->skills($classroom->academicYear, $classroom->level->cycle) as $skill) {
                $skills[] = ['skill' => $skill, 'level' => $levels->get($skill->id)?->level];
            }
        }

        // Bulletins validés (validation en cours, PDF prêt), du plus récent au plus ancien
        $reportCards = [];
        $cards = ReportCard::query()
            ->where('student_id', $student->id)
            ->where('status', ReportCardStatus::Ready)
            ->whereHas('closure', static fn (Builder $closure) => $closure->whereNull('reopened_at'))
            ->with('closure.term')
            ->get()
            ->sortByDesc(static fn (ReportCard $card): string => $card->closure->closed_at->toIso8601String());
        foreach ($cards as $card) {
            $reportCards[] = ['card' => $card, 'term' => $card->closure->term];
        }

        $marks = AttendanceMark::query()
            ->where('student_id', $student->id)
            ->when($enrollment !== null, static fn (Builder $query) => $query->whereDate('date', '>=', $enrollment?->academicYear->starts_on->toDateString()))
            ->with('justification')
            ->orderByDesc('date')
            ->get();

        $invoice = $enrollment === null ? null : Invoice::query()->where('enrollment_id', $enrollment->id)->first();
        $payments = $invoice === null ? new Collection : Payment::query()->where('invoice_id', $invoice->id)->with('cancellation')->orderByDesc('paid_at')->get();

        // Absences annoncées encore à venir ou en cours, et les autres de l'année
        $planned = PlannedAbsence::query()->where('student_id', $student->id)
            ->when($enrollment !== null, static fn ($query) => $query->whereDate('ends_on', '>=', $enrollment?->academicYear->starts_on->toDateString()))
            ->orderByDesc('starts_on')
            ->get();

        return new ChildView(
            $student,
            $enrollment,
            $mode->value,
            $settings === null ? 10 : $settings->gradeScale->max(),
            $terms,
            $term instanceof Term ? $term : null,
            $subjects,
            $skills,
            $reportCards,
            $marks,
            $invoice === null ? null : InvoiceBalance::of($invoice, $now),
            $payments,
            $planned,
            $this->gateway->name() !== 'none',
            FinancialPolicy::mobileMoney($this->context->school()),
        );
    }
}
