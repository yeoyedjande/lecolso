<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Résultat d'une opération hors connexion : applied (appliquée) ou rejected (refusée, avec `code` et `message`) ;
 * `replayed` : déjà traitée lors d'un envoi précédent (même résultat, rien de rejoué).
 *
 * @property-read array{id: string, status: string, code: string|null, message: string|null, replayed: bool} $resource
 */
final class SyncResultResource extends JsonResource
{
    /**
     * @return array{id: string, status: string, code: string|null, message: string|null, replayed: bool}
     */
    public function toArray(Request $request): array
    {
        $row = $this->resource;

        return [
            'id' => (string) $row['id'],
            'status' => (string) $row['status'],
            'code' => is_string($row['code']) ? $row['code'] : null,
            'message' => is_string($row['message']) ? $row['message'] : null,
            'replayed' => (bool) $row['replayed'],
        ];
    }
}
