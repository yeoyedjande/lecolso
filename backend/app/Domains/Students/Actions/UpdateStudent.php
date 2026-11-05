<?php

declare(strict_types=1);

namespace App\Domains\Students\Actions;

use App\Domains\Students\Models\Student;

/**
 * Modifie le dossier de l'élève (champs fournis seulement). Les champs médicaux n'arrivent ici que si l'auteur
 * a students.medical.view (vérifié par la requête).
 */
final class UpdateStudent
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function handle(Student $student, array $attributes): Student
    {
        $student->fill($attributes)->save();

        return $student;
    }
}
