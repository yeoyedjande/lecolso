<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Models\CashSession;
use App\Domains\Billing\Support\CashRegister;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Clôture d'une caisse par son caissier : espèces attendues calculées (encaissé − annulé − remboursé en espèces),
 * montant compté saisi, écart justifié par une note. Ensuite la session est figée : les mouvements suivants du même
 * jour sont refusés (409 cash_closed), une annulation ultérieure va dans la caisse du jour de son auteur.
 */
final class CloseCashSession
{
    /**
     * @throws BusinessConflict cash_closed
     * @throws ValidationException note : écart sans justification
     */
    public function handle(User $cashier, CashSession $session, int $counted, ?string $note, Carbon $now): CashSession
    {
        return DB::transaction(static function () use ($cashier, $session, $counted, $note, $now): CashSession {
            $locked = CashRegister::lock($session);
            if ($locked->isClosed()) {
                throw new BusinessConflict('cash_closed', 'Cette caisse est déjà clôturée.');
            }

            $expected = CashRegister::totals($locked)['expected_cash'];
            if ($counted !== $expected && ($note === null || $note === '')) {
                throw ValidationException::withMessages(['note' => 'Expliquez l’écart entre le montant compté et le montant attendu.']);
            }

            $locked->fill([
                'closed_at' => $now,
                'closed_by' => $cashier->id,
                'expected_cash' => $expected,
                'counted_cash' => $counted,
                'note' => $note,
            ])->save();

            return $locked;
        });
    }
}
