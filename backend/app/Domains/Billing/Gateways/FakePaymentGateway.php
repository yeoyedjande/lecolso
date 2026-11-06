<?php

declare(strict_types=1);

namespace App\Domains\Billing\Gateways;

use App\Domains\Billing\Contracts\PaymentGateway;
use App\Domains\Billing\Data\GatewayRequest;
use App\Domains\Billing\Data\GatewayResult;
use App\Domains\Billing\Enums\PaymentIntentStatus;
use App\Domains\Billing\Exceptions\InvalidWebhookSignature;
use JsonException;

/**
 * Prestataire factice (tests, local, staging) : aucun appel réseau. Un numéro qui finit par 99 est refusé (« solde
 * insuffisant »), tout autre est accepté dès la première interrogation. Webhook : JSON `{reference, status,
 * operator_reference}` signé en HMAC-SHA256 (en-tête `x-fake-signature`, secret `services.payments.fake_secret`).
 */
final readonly class FakePaymentGateway implements PaymentGateway
{
    public const string NAME = 'fake';

    public function __construct(private string $secret) {}

    public function name(): string
    {
        return self::NAME;
    }

    public function initiate(GatewayRequest $request): GatewayResult
    {
        $outcome = str_ends_with($request->phone, '99') ? 'ko' : 'ok';

        return new GatewayResult("fake_{$outcome}_{$request->intentId}", PaymentIntentStatus::Pending);
    }

    public function parseWebhook(string $payload, array $headers): GatewayResult
    {
        if (! hash_equals($this->sign($payload), $headers['x-fake-signature'] ?? '')) {
            throw new InvalidWebhookSignature('Signature invalide.');
        }
        try {
            $data = json_decode($payload, true, 4, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new InvalidWebhookSignature('Notification illisible.');
        }
        $reference = is_array($data) && is_string($data['reference'] ?? null) ? $data['reference'] : throw new InvalidWebhookSignature('Référence absente.');
        $status = is_string($data['status'] ?? null) ? PaymentIntentStatus::tryFrom($data['status']) : null;
        $operator = is_string($data['operator_reference'] ?? null) ? $data['operator_reference'] : null;

        return new GatewayResult(
            $reference,
            $status ?? PaymentIntentStatus::Failed,
            $operator,
            $status === PaymentIntentStatus::Failed ? 'Paiement refusé par l’opérateur.' : null,
        );
    }

    public function status(string $reference): GatewayResult
    {
        return str_starts_with($reference, 'fake_ko_')
            ? new GatewayResult($reference, PaymentIntentStatus::Failed, null, 'Solde insuffisant.')
            : new GatewayResult($reference, PaymentIntentStatus::Succeeded, 'FK'.strtoupper(substr(hash('sha256', $reference), 0, 10)));
    }

    /** Signature d'une notification (tests et simulation). */
    public function sign(string $payload): string
    {
        return hash_hmac('sha256', $payload, $this->secret);
    }
}
