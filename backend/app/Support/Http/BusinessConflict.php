<?php

declare(strict_types=1);

namespace App\Support\Http;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Conflit métier (409) : l'action est comprise mais refusée par une règle du domaine.
 * Réponse { message, code } ; `code` est stable et lu par le frontend.
 */
final class BusinessConflict extends RuntimeException
{
    public function __construct(public readonly string $errorCode, string $message)
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return new JsonResponse(['message' => $this->getMessage(), 'code' => $this->errorCode], 409);
    }
}
