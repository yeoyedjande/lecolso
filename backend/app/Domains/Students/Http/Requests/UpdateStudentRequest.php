<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Identity\Models\User;

/**
 * Modification du dossier (champs envoyés seulement ; chaîne vide = effacer un champ facultatif). Les champs médicaux
 * sont refusés (422) sans students.medical.view sur l'élève.
 */
final class UpdateStudentRequest extends ManageStudentRequest
{
    use StudentFieldRules;

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $user = $this->user();

        return self::studentRules('', false, $user instanceof User && $user->can('viewMedical', $this->student()));
    }

    /**
     * @return array<string, mixed>
     */
    public function studentChanges(): array
    {
        /** @var array<string, mixed> $validated */
        $validated = $this->validated();

        return self::studentAttributes($validated);
    }
}
