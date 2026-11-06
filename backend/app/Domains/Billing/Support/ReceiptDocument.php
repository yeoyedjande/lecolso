<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Billing\Enums\PaymentMethod;
use App\Domains\Billing\Models\Payment;
use App\Domains\Tenancy\Models\School;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;
use Illuminate\Support\Carbon;
use NumberFormatter;

/**
 * Données du gabarit `receipts.receipt` : école émettrice (logo en data URI, le rendu n'a aucun accès réseau),
 * paiement (montant en chiffres et en lettres), élève, classe, année, payeur, reste à payer au jour du rendu et,
 * pour la version annulée, le motif et la date de l'annulation. Dates au format JJ/MM/AAAA, heure d'Abidjan.
 */
final readonly class ReceiptDocument
{
    private const string TIMEZONE = 'Africa/Abidjan';

    public function __construct(private Filesystems $filesystems) {}

    /**
     * @return array<string, mixed>
     */
    public function data(School $school, Payment $payment, bool $cancelled, Carbon $now): array
    {
        $payment->loadMissing(['cancellation', 'invoice.studentRecord', 'invoice.academicYear', 'invoice.enrollment.classroom.level']);
        $invoice = $payment->invoice;
        $cancellation = $cancelled ? $payment->cancellation : null;

        return [
            'school' => [
                'name' => $school->name,
                'address' => $school->address,
                'city' => $school->city,
                'phone' => $school->phone,
                'email' => $school->email,
                'logo' => $this->logo($school),
            ],
            'number' => $payment->receipt_number,
            'paid_at' => $payment->paid_at->copy()->setTimezone(self::TIMEZONE)->format('d/m/Y à H:i'),
            'amount' => self::money($payment->amount),
            'amount_words' => self::words($payment->amount),
            'method' => self::methodLabel($payment->method),
            'reference' => $payment->reference,
            'payer' => $payment->payer_name,
            'cashier' => $payment->cashier_name,
            'student' => $invoice->studentRecord->fullName(),
            'matricule' => $invoice->studentRecord->matricule,
            'classroom' => $invoice->enrollment->classroom->name(),
            'year' => $invoice->academicYear->label,
            'remaining' => self::money(InvoiceBalance::of($invoice, $now)->remaining),
            'remaining_on' => $now->copy()->setTimezone(self::TIMEZONE)->format('d/m/Y'),
            'cancellation' => $cancellation === null ? null : [
                'reason' => $cancellation->reason,
                'at' => $cancellation->created_at->copy()->setTimezone(self::TIMEZONE)->format('d/m/Y'),
                'by' => $cancellation->cancelled_by_name,
            ],
        ];
    }

    /** 1250500 → « 1 250 500 FCFA » (espaces insécables). */
    public static function money(int $amount): string
    {
        return number_format($amount, 0, ',', "\u{202F}").' FCFA';
    }

    /** 1250500 → « un million deux cent cinquante mille cinq cents francs CFA ». */
    public static function words(int $amount): string
    {
        $words = (new NumberFormatter('fr', NumberFormatter::SPELLOUT))->format($amount);

        return ($words === false ? (string) $amount : $words).' francs CFA';
    }

    public static function methodLabel(PaymentMethod $method): string
    {
        return match ($method) {
            PaymentMethod::Cash => 'Espèces',
            PaymentMethod::OrangeMoney => 'Orange Money',
            PaymentMethod::MtnMomo => 'MTN MoMo',
            PaymentMethod::MoovMoney => 'Moov Money',
            PaymentMethod::Wave => 'Wave',
            PaymentMethod::Cheque => 'Chèque',
            PaymentMethod::Transfer => 'Virement',
        };
    }

    private function logo(School $school): ?string
    {
        if ($school->logo_path === null) {
            return null;
        }
        $bytes = $this->filesystems->disk()->get($school->logo_path);

        return $bytes === null ? null : 'data:image/webp;base64,'.base64_encode($bytes);
    }
}
