<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Contracts\PaymentGateway;
use App\Domains\Billing\Exceptions\InvalidWebhookSignature;
use App\Domains\Billing\Models\PaymentIntent;
use App\Domains\Billing\Models\PaymentWebhookEvent;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Notification du prestataire (hors établissement) : signature vérifiée, école retrouvée depuis la demande
 * (`payment_intent_school`, SECURITY DEFINER), puis traitement dans le contexte de cette école. Idempotent : une
 * notification déjà reçue (même référence et même état) n'a aucun effet.
 */
final readonly class HandlePaymentWebhook
{
    public function __construct(
        private PaymentGateway $gateway,
        private SettleMobilePayment $settle,
        private TenantContext $context,
    ) {}

    /**
     * @param  array<string, string>  $headers  en-têtes en minuscules
     *
     * @throws InvalidWebhookSignature
     */
    public function handle(string $provider, string $payload, array $headers, Carbon $now): void
    {
        if ($provider !== $this->gateway->name()) {
            throw new NotFoundHttpException;
        }
        $result = $this->gateway->parseWebhook($payload, $headers);
        $schoolId = DB::connection(TenantContext::CONNECTION)->scalar('select payment_intent_school(?, ?)', [$provider, $result->reference]);
        if (! is_string($schoolId)) {
            throw new NotFoundHttpException;
        }

        // Marque de notification et règlement dans une même transaction : un règlement qui échoue n'est pas marqué
        // comme traité, la notification suivante du prestataire le refera
        $this->context->run($schoolId, fn () => DB::transaction(function () use ($provider, $result, $now): void {
            $intent = PaymentIntent::query()->where('provider', $provider)->where('provider_reference', $result->reference)->firstOrFail();
            $event = PaymentWebhookEvent::query()->createOrFirst(
                ['provider' => $provider, 'event_key' => $result->reference.':'.$result->status->value],
                ['payment_intent_id' => $intent->id, 'status' => $result->status->value],
            );
            if (! $event->wasRecentlyCreated) {
                return;
            }
            $this->settle->handle($intent, $result, $now);
        }));
    }
}
