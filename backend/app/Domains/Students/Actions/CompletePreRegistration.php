<?php

declare(strict_types=1);

namespace App\Domains\Students\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Contracts\SmsSender;
use App\Domains\Students\Enums\PreRegistrationStatus;
use App\Domains\Students\Jobs\SendPreRegistrationSms;
use App\Domains\Students\Models\PreRegistration;
use App\Domains\Students\Models\Student;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Pré-inscription menée à son terme par l'inscription pré-remplie : à appeler dans la transaction qui inscrit
 * l'élève (le dossier reste en attente si l'inscription échoue). SMS au parent après la validation.
 */
final readonly class CompletePreRegistration
{
    public function __construct(private SmsSender $sms) {}

    /**
     * @throws BusinessConflict already_decided
     */
    public function handle(User $author, PreRegistration $preRegistration, Student $student, Carbon $now): void
    {
        $locked = PreRegistration::query()->whereKey($preRegistration->id)->lockForUpdate()->firstOrFail();
        if ($locked->status !== PreRegistrationStatus::Pending) {
            throw new BusinessConflict('already_decided', 'Cette pré-inscription a déjà été traitée.');
        }
        $locked->fill([
            'status' => PreRegistrationStatus::Enrolled,
            'decided_by' => $author->id,
            'decided_by_name' => $author->name,
            'decided_at' => $now,
            'student_id' => $student->id,
            // Sans fournisseur SMS, aucun envoi n'est tenté ni annoncé
            'notification_status' => $this->sms->available() ? SendPreRegistrationSms::QUEUED : null,
        ])->save();

        if ($locked->notification_status !== null) {
            DB::afterCommit(static fn () => SendPreRegistrationSms::dispatch($locked->school_id, $locked->id));
        }
    }
}
