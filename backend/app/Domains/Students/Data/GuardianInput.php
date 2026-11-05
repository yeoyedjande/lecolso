<?php

declare(strict_types=1);

namespace App\Domains\Students\Data;

use App\Domains\Students\Enums\GuardianRelation;

/** Tuteur saisi à l'inscription ou ajouté au dossier ; téléphone déjà en E.164. */
final readonly class GuardianInput
{
    public function __construct(
        public string $name,
        public string $phone,
        public ?string $email,
        public ?string $profession,
        public GuardianRelation $relation,
        public bool $isPrimaryContact,
        public bool $isPayer,
        public bool $canPickUp,
    ) {}
}
