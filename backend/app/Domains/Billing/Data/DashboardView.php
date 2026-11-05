<?php

declare(strict_types=1);

namespace App\Domains\Billing\Data;

/**
 * Tableau de bord : effectifs de l'année en cours par cycle et, avec billing.view, chiffres financiers (FCFA).
 */
final readonly class DashboardView
{
    /**
     * @param  list<array{cycle_id: string, code: string, name: string, students: int, classrooms: int}>  $byCycle
     * @param  array{collected_month: int, payments_month: int, expected_month: int, overdue: int, collection_rate: int, monthly: list<array{month: string, collected: int}>, recent_payments: list<array{payment_id: string, receipt_number: string, paid_at: string, amount: int, student_name: string}>}|null  $finance
     */
    public function __construct(
        public string $today,
        public ?string $yearLabel,
        public int $students,
        public array $byCycle,
        public ?array $finance,
    ) {}
}
