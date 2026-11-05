<?php

declare(strict_types=1);

namespace App\Domains\Students\Support;

use App\Domains\Students\Data\GuardianInput;
use App\Domains\Students\Models\Guardian;

/**
 * Tuteurs de l'école, un par téléphone : un tuteur déjà connu (frère ou sœur inscrit) est réutilisé, et seuls
 * ses champs vides sont complétés (on n'écrase pas une fiche existante par une nouvelle saisie).
 */
final class GuardianDirectory
{
    public function findOrCreate(GuardianInput $input): Guardian
    {
        $guardian = Guardian::query()->where('phone', $input->phone)->first();

        if ($guardian === null) {
            return Guardian::query()->create([
                'name' => $input->name,
                'phone' => $input->phone,
                'email' => $input->email,
                'profession' => $input->profession,
            ]);
        }

        $guardian->fill(array_filter([
            'email' => $guardian->email ?? $input->email,
            'profession' => $guardian->profession ?? $input->profession,
        ], static fn (?string $value): bool => $value !== null))->save();

        return $guardian;
    }
}
