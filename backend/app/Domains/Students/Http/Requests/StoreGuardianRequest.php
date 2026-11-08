<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Students\Data\GuardianInput;

/**
 * Ajouter un tuteur au dossier (téléphone d'un tuteur connu de l'école : il est réutilisé). `is_payer` ou
 * `is_primary_contact` : la qualité passe à ce tuteur.
 */
final class StoreGuardianRequest extends ManageStudentRequest
{
    use StudentFieldRules;

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return self::guardianRules('', true);
    }

    public function guardian(): GuardianInput
    {
        /** @var array<string, mixed> $validated */
        $validated = $this->validated();

        return self::guardianInput($validated, false, false);
    }
}
