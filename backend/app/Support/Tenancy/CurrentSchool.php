<?php

declare(strict_types=1);

namespace App\Support\Tenancy;

use App\Domains\Tenancy\Models\School;

/**
 * École courante de la requête ou du job. Liaison « scoped » : Laravel la vide entre deux requêtes
 * et avant chaque job. Ne pas l'écrire directement : passer par TenantContext, qui pose aussi la variable PostgreSQL.
 */
final class CurrentSchool
{
    private ?string $id = null;

    private ?School $school = null;

    public function id(): ?string
    {
        return $this->id;
    }

    /** École courante, chargée à la demande. */
    public function get(): ?School
    {
        if ($this->id !== null && $this->school === null) {
            $this->school = School::query()->find($this->id);
        }

        return $this->school;
    }

    public function set(string $id, ?School $school = null): void
    {
        $this->id = $id;
        $this->school = $school;
    }

    public function forget(): void
    {
        $this->id = null;
        $this->school = null;
    }
}
