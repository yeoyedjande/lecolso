<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Controllers;

use App\Domains\Billing\Actions\HandlePaymentWebhook;
use App\Domains\Billing\Exceptions\InvalidWebhookSignature;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

final class PaymentWebhookController
{
    /**
     * Notification d'un prestataire Mobile Money.
     *
     * Hors établissement : signature vérifiée (401 sinon), école retrouvée depuis la demande de paiement (404 si
     * inconnue), traitement idempotent (une notification rejouée n'a aucun effet).
     *
     * @unauthenticated
     */
    public function __invoke(Request $request, string $provider, HandlePaymentWebhook $handle): JsonResponse
    {
        $headers = [];
        foreach ($request->headers->all() as $name => $values) {
            $headers[strtolower($name)] = (string) ($values[0] ?? '');
        }

        try {
            $handle->handle($provider, $request->getContent(), $headers, Carbon::now());
        } catch (InvalidWebhookSignature) {
            return new JsonResponse(['message' => 'Signature invalide.'], 401);
        }

        return new JsonResponse(['received' => true]);
    }
}
