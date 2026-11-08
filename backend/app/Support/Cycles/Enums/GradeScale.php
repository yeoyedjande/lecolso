<?php

declare(strict_types=1);

namespace App\Support\Cycles\Enums;

/** Barème des moyennes d'un cycle : sur 10 (primaire ivoirien) ou sur 20 (collège, V2). */
enum GradeScale: string
{
    case Ten = '10';
    case Twenty = '20';

    public function max(): int
    {
        return (int) $this->value;
    }
}
