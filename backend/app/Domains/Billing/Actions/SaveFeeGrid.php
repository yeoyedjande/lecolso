<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Billing\Models\FeeSchedule;
use Illuminate\Support\Facades\DB;

/**
 * Montants annuels de la grille pour une année (montant 0 = pas de frais de ce type pour ce niveau). Ne touche pas
 * aux factures déjà émises : la grille ne s'applique qu'aux nouvelles inscriptions (décision du 05/11/2026).
 */
final class SaveFeeGrid
{
    /**
     * @param  list<array{level_id: string, fee_type_id: string, amount: int}>  $amounts
     */
    public function handle(AcademicYear $year, array $amounts): void
    {
        DB::transaction(static function () use ($year, $amounts): void {
            foreach ($amounts as $entry) {
                $keys = ['academic_year_id' => $year->id, 'level_id' => $entry['level_id'], 'fee_type_id' => $entry['fee_type_id']];

                $entry['amount'] === 0
                    ? FeeSchedule::query()->where($keys)->delete()
                    : FeeSchedule::query()->updateOrCreate($keys, ['amount' => $entry['amount']]);
            }
        });
    }
}
