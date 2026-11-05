<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Actions;

use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use App\Support\Http\BusinessConflict;

/**
 * Modifie l'identité de l'école courante : nom, préfixe des matricules, ville, adresse, téléphone, e-mail, devise
 * (champs fournis seulement).
 */
final class UpdateSchoolProfile
{
    /**
     * @param  array{name?: string, code?: string, city?: string|null, address?: string|null, phone?: string|null, email?: string|null, motto?: string|null}  $attributes
     *
     * @throws BusinessConflict code_locked : des matricules ont déjà été émis avec le préfixe actuel
     */
    public function handle(School $school, array $attributes): School
    {
        if (isset($attributes['code']) && $attributes['code'] !== $school->code && self::codeLocked()) {
            throw new BusinessConflict('code_locked', 'Des matricules ont déjà été attribués : le préfixe ne peut plus changer.');
        }

        // École courante : autorisé par la RLS (politique current_school_update)
        $school->fill($attributes)->save();

        return $school;
    }

    /** Un matricule a déjà été émis dans l'école courante (élèves supprimés compris : un matricule n'est jamais réutilisé). */
    public static function codeLocked(): bool
    {
        return Student::withTrashed()->exists();
    }
}
