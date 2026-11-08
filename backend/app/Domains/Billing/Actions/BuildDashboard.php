<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Attendance\Enums\AttendanceStatus;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Models\RollCall;
use App\Domains\Attendance\Support\ClassRoster;
use App\Domains\Billing\Data\DashboardView;
use App\Domains\Billing\Models\Installment;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\Payment;
use App\Domains\Billing\Support\Amount;
use App\Domains\Billing\Support\BillingScope;
use App\Domains\Billing\Support\CashRegister;
use App\Domains\Billing\Support\InvoiceTotals;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Models\Enrollment;
use App\Support\Cycles\Enums\AttendanceMode;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Chiffres du tableau de bord (année en cours), limités aux cycles de l'utilisateur : effectifs (students.view) et
 * finances (billing.view) — encaissé et attendu du mois, retard, taux de recouvrement, encaissements par mois,
 * derniers encaissements. Un utilisateur sans billing.view n'a pas de finances (null).
 */
final readonly class BuildDashboard
{
    private const int RECENT = 8;

    public function __construct(private BillingScope $scope) {}

    public function handle(User $user, Carbon $now): DashboardView
    {
        $today = CashRegister::businessDate($now);
        $year = AcademicYear::query()->where('is_current', true)->first();
        $studentCycles = $this->scope->cycles($user, 'students.view');
        $billingCycles = $this->scope->cycles($user, 'billing.view');
        $attendanceCycles = $this->scope->cycles($user, 'attendance.view');

        $byCycle = [];
        $students = 0;
        if ($year !== null && $studentCycles !== []) {
            $cycles = Cycle::query()->orderBy('position')
                ->when($studentCycles !== null, static fn (Builder $q) => $q->whereKey($studentCycles ?? []))
                ->get();
            foreach ($cycles as $cycle) {
                $inCycle = static fn (Builder $q) => $q->whereHas('level', static fn (Builder $level) => $level->where('cycle_id', $cycle->id));
                $count = Enrollment::query()->where('academic_year_id', $year->id)->where('status', EnrollmentStatus::Active)
                    ->whereHas('student')
                    ->whereHas('classroom', $inCycle)
                    ->count();
                $byCycle[] = [
                    'cycle_id' => $cycle->id,
                    'code' => $cycle->code,
                    'name' => $cycle->name,
                    'students' => $count,
                    'classrooms' => Classroom::query()->where('academic_year_id', $year->id)->where($inCycle)->count(),
                ];
                $students += $count;
            }
        }

        return new DashboardView(
            $today,
            $year?->label,
            $students,
            $byCycle,
            $year === null || $billingCycles === [] ? null : $this->finance($year, $billingCycles, $now, $today),
            $year === null || $attendanceCycles === [] ? null : $this->attendance($year, $attendanceCycles, $today),
        );
    }

    /**
     * Présences du jour et taux des 10 derniers jours d'appel, dans les classes qui font l'appel (paramètre du cycle).
     *
     * @param  list<string>|null  $cycles
     * @return array{absent_today: int, late_today: int, roll_calls_missing: int, rates: list<array{date: string, rate: int}>}
     */
    private function attendance(AcademicYear $year, ?array $cycles, string $today): array
    {
        $classrooms = Classroom::query()->where('academic_year_id', $year->id)
            ->when($cycles !== null, static fn (Builder $q) => $q->whereHas('level', static fn (Builder $level) => $level->whereIn('cycle_id', $cycles ?? [])))
            ->with('level.cycle')
            ->get()
            ->filter(static fn (Classroom $classroom): bool => $classroom->level->cycle->settings->attendanceMode === AttendanceMode::RollCall);
        $ids = $classrooms->modelKeys();
        $byId = $classrooms->keyBy('id');

        $marksOn = static fn (string $date, AttendanceStatus $status): int => AttendanceMark::query()->whereDate('date', $date)->where('status', $status)
            ->whereHas('rollCall', static fn (Builder $call) => $call->whereIn('classroom_id', $ids))
            ->whereHas('student')
            ->count();
        $takenToday = RollCall::query()->whereIn('classroom_id', $ids)->whereDate('date', $today)->count();

        $rates = [];
        $byDay = [];
        foreach (RollCall::query()->whereIn('classroom_id', $ids)->where('date', '<=', $today)->orderByDesc('date')->get() as $call) {
            $byDay[$call->date->toDateString()][] = $call->classroom_id;
        }
        foreach (array_slice($byDay, 0, 10, true) as $date => $calls) {
            $date = (string) $date;
            // Effectif de chaque classe à la date de l'appel (inscriptions et départs du moment)
            $expected = array_sum(array_map(static function (string $id) use ($byId, $date): int {
                $classroom = $byId->get($id);

                return $classroom instanceof Classroom ? ClassRoster::on($classroom, $date)->count() : 0;
            }, $calls));
            $absent = $marksOn($date, AttendanceStatus::Absent);
            $rates[] = ['date' => $date, 'rate' => $expected === 0 ? 100 : (int) round(max(0, $expected - $absent) / $expected * 100)];
        }

        return [
            'absent_today' => $marksOn($today, AttendanceStatus::Absent),
            'late_today' => $marksOn($today, AttendanceStatus::Late),
            'roll_calls_missing' => Carbon::parse($today)->isWeekend() ? 0 : max(0, count($ids) - $takenToday),
            'rates' => array_reverse($rates),
        ];
    }

    /**
     * @param  list<string>|null  $cycles
     * @return array{collected_month: int, payments_month: int, expected_month: int, overdue: int, collection_rate: int, monthly: list<array{month: string, collected: int}>, recent_payments: list<array{payment_id: string, receipt_number: string, paid_at: string, amount: int, student_name: string}>}
     */
    private function finance(AcademicYear $year, ?array $cycles, Carbon $now, string $today): array
    {
        $inScope = static fn (Builder $invoices): Builder => $invoices->where('academic_year_id', $year->id)
            ->whereHas('student')
            ->when($cycles !== null, static fn (Builder $q) => $q->whereHas('enrollment.classroom.level', static fn (Builder $level) => $level->whereIn('cycle_id', $cycles ?? [])));
        $payments = static fn (): Builder => Payment::query()->whereDoesntHave('cancellation')->whereHas('invoice', $inScope);

        $month = substr($today, 0, 7);
        $monthStart = Carbon::parse($month.'-01')->startOfMonth();
        $monthEnd = $monthStart->copy()->endOfMonth();

        $due = 0;
        $overdue = 0;
        foreach (InvoiceTotals::select($inScope(Invoice::query()), Carbon::parse($today))->get() as $invoice) {
            $totals = InvoiceTotals::of($invoice);
            $due += $totals['due_to_date'];
            $overdue += $totals['overdue'];
        }

        $monthly = [];
        $cursor = $year->starts_on->copy()->startOfMonth();
        while ($cursor->lessThanOrEqualTo($monthStart) && $cursor->lessThanOrEqualTo($year->ends_on)) {
            $monthly[] = [
                'month' => $cursor->format('Y-m'),
                'collected' => Amount::of($payments()->whereBetween('paid_at', [$cursor->copy(), $cursor->copy()->endOfMonth()])->sum('amount')),
            ];
            $cursor->addMonth();
        }

        $recent = $payments()->with('invoice.studentRecord')->orderByDesc('paid_at')->limit(self::RECENT)->get()
            ->map(static fn (Payment $payment): array => [
                'payment_id' => $payment->id,
                'receipt_number' => $payment->receipt_number,
                'paid_at' => $payment->paid_at->toIso8601String(),
                'amount' => $payment->amount,
                'student_name' => $payment->invoice->studentRecord->fullName(),
            ])->all();
        $recent = array_values($recent);

        return [
            'collected_month' => Amount::of($payments()->whereBetween('paid_at', [$monthStart, $monthEnd])->sum('amount')),
            'payments_month' => $payments()->whereBetween('paid_at', [$monthStart, $monthEnd])->count(),
            'expected_month' => Amount::of(Installment::query()->whereHas('invoice', $inScope)->whereBetween('due_on', [$monthStart->toDateString(), $monthEnd->toDateString()])->sum('amount')),
            'overdue' => $overdue,
            'collection_rate' => $due <= 0 ? 100 : (int) round(max(0, $due - $overdue) / $due * 100),
            'monthly' => $monthly,
            'recent_payments' => $recent,
        ];
    }
}
