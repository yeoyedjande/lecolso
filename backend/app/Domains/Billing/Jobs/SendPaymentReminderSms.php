<?php

declare(strict_types=1);

namespace App\Domains\Billing\Jobs;

use App\Domains\Billing\Enums\ReminderStatus;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\PaymentReminder;
use App\Domains\Messaging\Contracts\SmsSender;
use App\Domains\Messaging\Sms\UnconfiguredSmsSender;
use App\Support\Tenancy\RunsInSchool;
use App\Support\Tenancy\TenantAware;
use App\Support\Tenancy\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Carbon;
use Throwable;

/**
 * Envoi du SMS d'une relance, dans l'école de la relance. Le texte (prénoms des enfants, montant, école) est composé
 * ici et n'est ni stocké ni journalisé. Un échec (fournisseur non configuré, refus) est noté sur la relance, sans
 * nouvel essai automatique : on relance à la main.
 */
final class SendPaymentReminderSms implements ShouldQueue, TenantAware
{
    use Dispatchable, InteractsWithQueue, Queueable, RunsInSchool;

    public int $tries = 1;

    public function __construct(
        public string $schoolId,
        public string $reminderId,
    ) {}

    public function handle(SmsSender $sms, TenantContext $context): void
    {
        $reminder = PaymentReminder::query()->find($this->reminderId);
        if ($reminder === null || $reminder->status !== ReminderStatus::Queued) {
            return;
        }

        try {
            $sms->send($reminder->phone, self::message($context->school()->name ?? '', $reminder));
            $reminder->fill(['status' => ReminderStatus::Sent, 'sent_at' => Carbon::now()])->save();
        } catch (Throwable) {
            $reminder->fill([
                'status' => ReminderStatus::Failed,
                'failure' => $sms instanceof UnconfiguredSmsSender ? 'Aucun fournisseur SMS n’est configuré.' : 'Envoi refusé par le fournisseur SMS.',
            ])->save();
        }
    }

    /** « Les Lauriers : bonjour, la scolarité d'Awa et Ismaël présente un retard de 60 000 FCFA. Merci de régulariser. » */
    public static function message(string $school, PaymentReminder $reminder): string
    {
        $names = Invoice::query()->whereKey($reminder->invoice_ids)->with('studentRecord')->get()
            ->map(static fn (Invoice $invoice): string => $invoice->studentRecord->first_name)
            ->unique()
            ->values()
            ->all();
        $last = array_pop($names);
        $children = $names === [] ? (string) $last : implode(', ', $names).' et '.$last;
        $elision = preg_match('/^[AEIOUYÂÉÈÊËÎÏÔÛÜH]/iu', $children) === 1 ? 'd’' : 'de ';
        $amount = number_format($reminder->overdue_amount, 0, ',', ' ');

        return sprintf('%s : bonjour, la scolarité %s%s présente un retard de %s FCFA. Merci de régulariser auprès de l’école.', $school, $elision, $children, $amount);
    }
}
