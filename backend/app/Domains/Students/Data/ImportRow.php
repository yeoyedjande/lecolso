<?php

declare(strict_types=1);

namespace App\Domains\Students\Data;

/**
 * Ligne d'un fichier d'import, telle que lue par le navigateur (valeurs brutes, vérifiées par l'import) : élève,
 * classe de l'année en cours par son nom (« CE1 A »), un parent payeur et contact principal.
 */
final readonly class ImportRow
{
    public function __construct(
        public int $line,
        public string $lastName,
        public string $firstName,
        public string $gender,
        public string $birthDate,
        public string $classroom,
        public ?string $address,
        public string $guardianName,
        public string $guardianRelation,
        public string $guardianPhone,
    ) {}
}
