<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Actions;

use App\Domains\Tenancy\Models\School;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;

/** Retire le logo de l'école courante (fichier supprimé du stockage). Idempotent. */
final readonly class RemoveSchoolLogo
{
    public function __construct(private Filesystems $filesystems) {}

    public function handle(School $school): School
    {
        $previous = $school->logo_path;

        if ($previous === null) {
            return $school;
        }

        $school->logo_path = null;
        $school->save();
        $this->filesystems->disk()->delete($previous);

        return $school;
    }
}
