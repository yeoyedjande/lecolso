<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Data;

use App\Domains\Tenancy\Enums\SchoolType;

/** Demande de création d'une école par le super-admin (données déjà validées, téléphone en E.164). */
final readonly class NewSchool
{
    /**
     * @param  list<string>  $cycles  codes du catalogue (config/cycles.php)
     */
    public function __construct(
        public string $name,
        public string $slug,
        public ?string $city,
        public SchoolType $type,
        public array $cycles,
        public string $directorName,
        public string $directorPhone,
        public ?string $directorEmail,
    ) {}
}
