<?php

declare(strict_types=1);

namespace App\Domains\Students\Policies;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\StudentAccess;
use App\Support\Tenancy\TenantContext;

/**
 * Élèves de l'école courante. Voir : StudentAccess (cycle, classes de l'enseignant, enfants du parent).
 * Gérer : students.manage sur le cycle de la classe la plus récente de l'élève (ou de la classe visée).
 * Données médicales : students.medical.view, même périmètre que la consultation.
 */
final readonly class StudentPolicy
{
    public function __construct(
        private Authorizer $authorizer,
        private StudentAccess $access,
        private TenantContext $context,
    ) {}

    public function viewAny(User $user): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && array_key_exists('students.view', $this->authorizer->permissionsFor($user, $schoolId));
    }

    public function view(User $user, Student $student): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && $this->access->allows($user, $student, $schoolId);
    }

    public function viewMedical(User $user, Student $student): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && $this->access->allows($user, $student, $schoolId, 'students.medical.view');
    }

    /** Inscrire des élèves (students.manage sur au moins un cycle). */
    public function create(User $user): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && array_key_exists('students.manage', $this->authorizer->permissionsFor($user, $schoolId));
    }

    /** Saisir les données médicales d'un élève inscrit dans cette classe (students.medical.view sur son cycle). */
    public function viewMedicalIn(User $user, Classroom $classroom): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && $this->authorizer->allows($user, 'students.medical.view', $schoolId, $classroom->level->cycle_id);
    }

    /** Inscrire un nouvel élève dans cette classe (ou y faire passer un élève). */
    public function enrollIn(User $user, Classroom $classroom): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && $this->authorizer->allows($user, 'students.manage', $schoolId, $classroom->level->cycle_id);
    }

    /** Modifier le dossier, les tuteurs ou l'inscription ; supprimer le dossier. */
    public function update(User $user, Student $student): bool
    {
        $schoolId = $this->context->schoolId();

        return $schoolId !== null && $this->access->manages($user, $student, $schoolId);
    }
}
