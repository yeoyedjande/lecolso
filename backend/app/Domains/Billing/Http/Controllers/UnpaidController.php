<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Controllers;

use App\Domains\Billing\Actions\ListUnpaid;
use App\Domains\Billing\Actions\SendPaymentReminders;
use App\Domains\Billing\Http\Requests\RemindRequest;
use App\Domains\Billing\Http\Requests\UnpaidRequest;
use App\Domains\Billing\Http\Resources\ReminderOutcomeResource;
use App\Domains\Billing\Http\Resources\UnpaidRowResource;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

/** Impayés et relances SMS. */
final class UnpaidController
{
    /**
     * Impayés.
     *
     * Factures dont l'échu à aujourd'hui n'est pas réglé, toutes années, dans les cycles de l'utilisateur ; le plus
     * gros retard d'abord. Filtres `cycle_id`, `classroom_id`.
     */
    public function index(UnpaidRequest $request, ListUnpaid $list): AnonymousResourceCollection
    {
        return UnpaidRowResource::collection($list->handle($this->user($request), Carbon::now(), $request->cycleId(), $request->classroomId()));
    }

    /**
     * Relancer par SMS.
     *
     * Un SMS par payeur pour les factures choisies en retard, au plus une fois tous les 7 jours ; envoi en file.
     * 409 `sms_unavailable` sans fournisseur SMS configuré (rien n'est enregistré).
     */
    public function remind(RemindRequest $request, SendPaymentReminders $send): ReminderOutcomeResource
    {
        return new ReminderOutcomeResource($send->handle($this->user($request), $request->invoices(), Carbon::now()));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
