<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Students\Models\Student;
use LogicException;

/** Élève de la route (`{student}`), déjà résolu sous la RLS de l'école courante. */
trait StudentRequest
{
    public function student(): Student
    {
        $student = $this->route('student');

        return $student instanceof Student ? $student : throw new LogicException('Élève de la route introuvable.');
    }
}
