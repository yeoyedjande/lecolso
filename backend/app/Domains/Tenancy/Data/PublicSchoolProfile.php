<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Data;

/** Informations publiques d'une école (page <slug>.<domaine>) : aucune donnée personnelle ni identifiant interne. */
final readonly class PublicSchoolProfile
{
    /**
     * @param  list<array{code: string, name: string, levels: list<string>}>  $cycles
     */
    public function __construct(
        public string $name,
        public string $slug,
        public ?string $city,
        public string $type,
        public array $cycles,
    ) {}
}
