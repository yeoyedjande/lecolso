<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Requests;

use App\Domains\Attendance\Actions\ApplySyncOperations;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * File hors connexion : 1 à 100 opérations `{ id (UUID de l'appareil), type, payload }`. Chaque opération est
 * contrôlée comme son équivalent en ligne ; une opération déjà traitée renvoie son premier résultat.
 */
final class SyncRequest extends FormRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'operations' => ['required', 'array', 'min:1', 'max:100'],
            'operations.*.id' => ['required', 'uuid', 'distinct'],
            'operations.*.type' => ['required', Rule::in(ApplySyncOperations::TYPES)],
            'operations.*.payload' => ['required', 'array'],
        ];
    }

    /**
     * @return list<array{id: string, type: string, payload: array<string, mixed>}>
     */
    public function operations(): array
    {
        $operations = [];
        foreach ((array) $this->validated('operations') as $operation) {
            if (is_array($operation) && is_string($operation['id'] ?? null) && is_string($operation['type'] ?? null) && is_array($operation['payload'] ?? null)) {
                /** @var array<string, mixed> $payload */
                $payload = $operation['payload'];
                $operations[] = ['id' => $operation['id'], 'type' => $operation['type'], 'payload' => $payload];
            }
        }

        return $operations;
    }
}
