<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Requests;

use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\CurrentSchool;
use LogicException;

/** École courante (en-tête X-School-Id, résolue par ResolveSchool) pour les requêtes sur « son » école. */
trait CurrentSchoolRequest
{
    public function school(): School
    {
        return app(CurrentSchool::class)->get()
            ?? throw new LogicException('Route d’école sans école courante (middleware school).');
    }
}
