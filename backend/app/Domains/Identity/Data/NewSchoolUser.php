<?php

declare(strict_types=1);

namespace App\Domains\Identity\Data;

/** Compte à créer (ou compte existant à rattacher, par son téléphone) avec ses rôles dans l'école courante. */
final readonly class NewSchoolUser
{
    /**
     * @param  list<array{role: string, cycle_id: string|null}>  $roles
     */
    public function __construct(
        public string $name,
        public string $phone,
        public ?string $email,
        public array $roles,
    ) {}
}
