<?php

declare(strict_types=1);

namespace App\Domains\Students\Jobs;

use App\Domains\Messaging\Contracts\SmsSender;
use App\Domains\Messaging\Sms\UnconfiguredSmsSender;
use App\Domains\Students\Enums\PreRegistrationStatus;
use App\Domains\Students\Models\PreRegistration;
use App\Support\Tenancy\RunsInSchool;
use App\Support\Tenancy\TenantAware;
use App\Support\Tenancy\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Throwable;

/**
 * SMS au parent après la décision sur sa pré-inscription (refus avec motif, ou inscription faite), dans l'école de
 * la demande. Texte composé ici (école, numéro de dossier, motif ; jamais le prénom de l'enfant), ni stocké ni
 * journalisé. Échec noté sur la demande, sans nouvel essai automatique.
 */
final class SendPreRegistrationSms implements ShouldQueue, TenantAware
{
    use Dispatchable, InteractsWithQueue, Queueable, RunsInSchool;

    public const string QUEUED = 'queued';

    public int $tries = 1;

    public function __construct(
        public string $schoolId,
        public string $preRegistrationId,
    ) {}

    public function handle(SmsSender $sms, TenantContext $context): void
    {
        $preRegistration = PreRegistration::query()->find($this->preRegistrationId);
        if ($preRegistration === null || $preRegistration->notification_status !== self::QUEUED) {
            return;
        }

        try {
            $sms->send($preRegistration->guardian_phone, self::message($context->school()->name ?? '', $preRegistration));
            $preRegistration->fill(['notification_status' => 'sent', 'notification_failure' => null])->save();
        } catch (Throwable) {
            $preRegistration->fill([
                'notification_status' => 'failed',
                'notification_failure' => $sms instanceof UnconfiguredSmsSender ? 'Aucun fournisseur SMS n’est configuré.' : 'Envoi refusé par le fournisseur SMS.',
            ])->save();
        }
    }

    /** Tâche interrompue (délai dépassé) : l'envoi resté en file est noté en échec. École rétablie ici. */
    public function failed(?Throwable $exception): void
    {
        app(TenantContext::class)->run($this->schoolId, function (): void {
            PreRegistration::query()->whereKey($this->preRegistrationId)->where('notification_status', self::QUEUED)
                ->update(['notification_status' => 'failed', 'notification_failure' => 'Envoi interrompu.']);
        });
    }

    public static function message(string $school, PreRegistration $preRegistration): string
    {
        return $preRegistration->status === PreRegistrationStatus::Enrolled
            ? sprintf('%s : votre pré-inscription %s est acceptée et l’inscription est faite. Bienvenue !', $school, $preRegistration->reference)
            : sprintf('%s : votre pré-inscription %s n’a pas pu être retenue. Motif : %s. Contactez l’école pour en savoir plus.', $school, $preRegistration->reference, rtrim((string) $preRegistration->decision_note, '. '));
    }
}
