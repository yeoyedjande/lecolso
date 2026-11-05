<?php

declare(strict_types=1);

namespace App\Domains\Students\Data;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Students\Enums\BloodType;
use App\Domains\Students\Enums\Gender;

/**
 * Inscription d'un nouvel élève : son dossier, ses tuteurs (un payeur et un contact principal exactement) et sa classe.
 */
final readonly class NewEnrollment
{
    /**
     * @param  list<GuardianInput>  $guardians
     */
    public function __construct(
        public string $firstName,
        public string $lastName,
        public Gender $gender,
        public string $birthDate,
        public ?string $birthPlace,
        public ?string $address,
        public ?BloodType $bloodType,
        public ?string $allergies,
        public ?string $medicalNotes,
        public Classroom $classroom,
        public string $enrolledOn,
        public array $guardians,
    ) {}
}
