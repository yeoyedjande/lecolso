<?php

declare(strict_types=1);

namespace App\Domains\Students\Data;

use App\Domains\Students\Enums\Gender;

/** Pré-inscription saisie par une famille (validée par la requête publique ; téléphone en E.164). */
final readonly class PreRegistrationInput
{
    public function __construct(
        public string $cycleCode,
        public string $levelCode,
        public string $childLastName,
        public string $childFirstName,
        public Gender $childGender,
        public string $childBirthDate,
        public string $guardianName,
        public string $guardianPhone,
        public ?string $guardianEmail,
        public ?string $message,
    ) {}
}
