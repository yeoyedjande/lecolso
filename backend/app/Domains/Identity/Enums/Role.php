<?php

declare(strict_types=1);

namespace App\Domains\Identity\Enums;

/**
 * Rôles attribués par établissement (role_assignments), éventuellement limités à un cycle.
 * super_admin n'est pas une affectation d'école : c'est users.is_super_admin.
 * Permissions et Authorizer : sprint 0, étape 4.
 */
enum Role: string
{
    case SuperAdmin = 'super_admin';
    case Promoter = 'promoter';
    case Director = 'director';
    case Secretary = 'secretary';
    case Accountant = 'accountant';
    case Teacher = 'teacher';
    case Guardian = 'guardian';

    /** Rôles qui peuvent figurer dans role_assignments. */
    public function isAssignableToSchool(): bool
    {
        return $this !== self::SuperAdmin;
    }
}
