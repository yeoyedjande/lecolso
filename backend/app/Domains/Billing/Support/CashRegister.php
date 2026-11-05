<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Billing\Enums\PaymentMethod;
use App\Domains\Billing\Models\CashSession;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use LogicException;

/**
 * Sessions de caisse : une par caissier et par jour (Africa/Abidjan), ouverte au premier mouvement. Chaque mouvement
 * verrouille sa session (FOR UPDATE) jusqu'à la fin de la transaction : une clôture et un encaissement simultanés
 * s'attendent, et rien n'entre dans une caisse clôturée.
 */
final class CashRegister
{
    public static function businessDate(Carbon $at): string
    {
        $timezone = config('app.display_timezone');

        return $at->copy()->setTimezone(is_string($timezone) ? $timezone : 'Africa/Abidjan')->toDateString();
    }

    /**
     * Session du jour de l'utilisateur, ouverte si besoin et verrouillée.
     *
     * @throws BusinessConflict cash_closed : la caisse du jour de cet utilisateur est déjà clôturée
     */
    public static function openFor(User $user, Carbon $at): CashSession
    {
        $date = self::businessDate($at);
        // Création concurrente : createOrFirst rattrape la violation d'unicité (point de sauvegarde)
        $session = CashSession::query()->createOrFirst(
            ['cashier_id' => $user->id, 'business_date' => $date],
            ['cashier_name' => $user->name],
        );

        $locked = self::lock($session);
        if ($locked->isClosed()) {
            throw new BusinessConflict('cash_closed', 'Votre caisse du jour est clôturée : aucun mouvement ne peut plus y entrer.');
        }

        return $locked;
    }

    public static function lock(CashSession $session): CashSession
    {
        if (DB::transactionLevel() === 0) {
            throw new LogicException('Une session de caisse se verrouille dans la transaction du mouvement.');
        }

        return CashSession::query()->whereKey($session->id)->lockForUpdate()->firstOrFail();
    }

    /**
     * Totaux d'une session par moyen de paiement : encaissé, annulé, remboursé, net ; espèces attendues en caisse.
     *
     * @return array{methods: list<array{method: PaymentMethod, collected: int, cancelled: int, refunded: int, net: int, count: int}>, net_total: int, expected_cash: int}
     */
    public static function totals(CashSession $session): array
    {
        $session->loadMissing(['payments', 'cancellations.payment', 'refunds']);
        $collected = $cancelled = $refunded = $count = array_fill_keys(array_column(PaymentMethod::cases(), 'value'), 0);

        foreach ($session->payments as $payment) {
            $collected[$payment->method->value] += $payment->amount;
            $count[$payment->method->value]++;
        }
        foreach ($session->cancellations as $cancellation) {
            $cancelled[$cancellation->payment->method->value] += $cancellation->payment->amount;
        }
        foreach ($session->refunds as $refund) {
            $refunded[$refund->method->value] += $refund->amount;
        }

        $methods = [];
        $netTotal = 0;
        $expectedCash = 0;
        foreach (PaymentMethod::cases() as $method) {
            $key = $method->value;
            if ($collected[$key] === 0 && $cancelled[$key] === 0 && $refunded[$key] === 0) {
                continue;
            }
            $net = $collected[$key] - $cancelled[$key] - $refunded[$key];
            $netTotal += $net;
            if ($method === PaymentMethod::Cash) {
                $expectedCash = $net;
            }
            $methods[] = [
                'method' => $method,
                'collected' => $collected[$key],
                'cancelled' => $cancelled[$key],
                'refunded' => $refunded[$key],
                'net' => $net,
                'count' => $count[$key],
            ];
        }

        return ['methods' => $methods, 'net_total' => $netTotal, 'expected_cash' => $expectedCash];
    }
}
