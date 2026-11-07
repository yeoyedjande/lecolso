<?php

declare(strict_types=1);

namespace App\Domains\Students\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Students\Enums\PreRegistrationStatus;
use App\Domains\Students\Jobs\SendPreRegistrationSms;
use App\Domains\Students\Models\PreRegistration;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Refus motivé d'une pré-inscription en attente ; le parent est prévenu par SMS (motif compris). */
final class RefusePreRegistration
{
    /**
     * @throws BusinessConflict already_decided
     */
    public function handle(User $author, PreRegistration $preRegistration, string $reason, Carbon $now): PreRegistration
    {
        $refused = DB::transaction(static function () use ($author, $preRegistration, $reason, $now): PreRegistration {
            $locked = PreRegistration::query()->whereKey($preRegistration->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== PreRegistrationStatus::Pending) {
                throw new BusinessConflict('already_decided', 'Cette pré-inscription a déjà été traitée.');
            }
            $locked->fill([
                'status' => PreRegistrationStatus::Refused,
                'decided_by' => $author->id,
                'decided_by_name' => $author->name,
                'decided_at' => $now,
                'decision_note' => $reason,
                'notification_status' => SendPreRegistrationSms::QUEUED,
            ])->save();

            return $locked;
        });
        SendPreRegistrationSms::dispatch($refused->school_id, $refused->id);

        // Relue : en local et en test, la file est synchrone et le SMS est déjà parti
        return $refused->refresh()->load('level.cycle');
    }
}
