<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Billing\Enums\PayerKind;
use App\Domains\Billing\Models\Payer;
use App\Domains\Students\Models\GuardianLink;

/**
 * Payeur d'un élève : son tuteur payeur (V1), un payeur par tuteur dans l'école, dont le nom suit celui du tuteur.
 * Null si l'élève n'a pas de tuteur payeur.
 */
final class PayerDirectory
{
    public function forStudent(string $studentId): ?Payer
    {
        $link = GuardianLink::query()->with('guardian')->where('student_id', $studentId)->where('is_payer', true)->first();

        if ($link === null) {
            return null;
        }

        $payer = Payer::query()->firstOrNew(['guardian_id' => $link->guardian_id]);
        $payer->fill(['kind' => PayerKind::Guardian, 'name' => $link->guardian->name])->save();

        return $payer;
    }
}
