<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

/**
 * Tableau de bord : effectifs de l'année en cours par cycle, chiffres financiers (billing.view, FCFA) et présences
 * (attendance.view, classes qui font l'appel).
 */
final readonly class DashboardView
{
    /**
     * @param  list<array{cycle_id: string, code: string, name: string, students: int, classrooms: int}>  $byCycle
     * @param  array{absent_today: int, late_today: int, roll_calls_missing: int, rates: list<array{date: string, rate: int}>}|null  $attendance
     * @param  array{collected_month: int, payments_month: int, expected_month: int, overdue: int, collection_rate: int, monthly: list<array{month: string, collected: int}>, recent_payments: list<array{payment_id: string, receipt_number: string, paid_at: string, amount: int, student_name: string}>}|null  $finance
     */
    public function __construct(
        public string $today,
        public ?string $yearLabel,
        public int $students,
        public array $byCycle,
        public ?array $finance,
        public ?array $attendance = null,
    ) {}
}
