<?php

declare(strict_types=1);

namespace App\Domains\Billing\Support;

use App\Domains\Billing\Enums\LineKind;
use App\Domains\Billing\Models\Installment;
use App\Domains\Billing\Models\InstallmentDate;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\InvoiceLine;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Échéances d'une facture. Frais réparti : parts égales sur les dates du calendrier, en ne gardant que les périodes
 * qui ne sont pas terminées à la date de départ (inscription en cours d'année : échéances restantes seulement).
 * Remises : réparties en partant de la dernière échéance, sans jamais rendre une échéance négative.
 */
final class InvoiceSchedule
{
    /**
     * Parts d'un montant annuel pour les périodes restantes à partir de $from. La période i va de sa date à la
     * suivante ; elle est due si $from est avant la date suivante (la dernière période est toujours due).
     *
     * @param  Collection<int, InstallmentDate>  $dates
     * @return list<array{due_on: string, label: string, amount: int}>
     */
    public static function remainingShares(int $annualAmount, Collection $dates, Carbon $from): array
    {
        $list = $dates->values();
        $shares = Split::evenly($annualAmount, max(1, $list->count()));
        $result = [];

        foreach ($list as $index => $date) {
            $next = $list->get($index + 1);
            if ($next instanceof InstallmentDate && $from->greaterThanOrEqualTo($next->due_on)) {
                continue;
            }

            $result[] = [
                'due_on' => ($date->due_on->lessThan($from) ? $from : $date->due_on)->toDateString(),
                'label' => $date->label,
                'amount' => $shares[$index] ?? 0,
            ];
        }

        return $result;
    }

    /**
     * Crée une ligne et ses échéances (somme des échéances = montant de la ligne).
     *
     * @param  list<array{due_on: string, label: string, amount: int}>  $shares
     * @param  array<string, mixed>  $attributes
     */
    public static function addLine(Invoice $invoice, array $attributes, array $shares): InvoiceLine
    {
        $line = InvoiceLine::query()->create([
            ...$attributes,
            'invoice_id' => $invoice->id,
            'amount' => array_sum(array_column($shares, 'amount')),
        ]);

        foreach ($shares as $share) {
            if ($share['amount'] === 0) {
                continue;
            }
            Installment::query()->create([
                'invoice_id' => $invoice->id,
                'invoice_line_id' => $line->id,
                'due_on' => $share['due_on'],
                'label' => $share['label'],
                'amount' => $share['amount'],
            ]);
        }

        return $line;
    }

    /**
     * Répartit de nouveau toutes les remises de la facture : de la dernière échéance vers la première, chacune
     * plafonnée au montant net de sa date.
     *
     * @throws BusinessConflict discount_exceeds : les remises dépassent ce qui reste à facturer
     */
    public static function rebalanceDiscounts(Invoice $invoice): void
    {
        $discounts = InvoiceLine::query()->where('invoice_id', $invoice->id)->where('kind', LineKind::Discount)->orderBy('created_at')->get();
        Installment::query()->whereIn('invoice_line_id', $discounts->pluck('id'))->delete();

        if ($discounts->isEmpty()) {
            return;
        }

        // Montant net par date (frais et lignes manuelles), de la plus tardive à la plus proche
        $byDate = Installment::query()->where('invoice_id', $invoice->id)
            ->selectRaw('due_on, min(label) as label, sum(amount) as amount')
            ->groupBy('due_on')
            ->orderByDesc('due_on')
            ->get()
            ->map(static fn (Installment $row): array => [
                'due_on' => $row->due_on->toDateString(),
                'label' => $row->label,
                'available' => Amount::of($row->getAttribute('amount')),
            ])
            ->all();

        foreach ($discounts as $discount) {
            $remaining = -$discount->amount;

            foreach ($byDate as $key => $date) {
                if ($remaining === 0) {
                    break;
                }
                $part = min($remaining, $date['available']);
                if ($part <= 0) {
                    continue;
                }
                Installment::query()->create([
                    'invoice_id' => $invoice->id,
                    'invoice_line_id' => $discount->id,
                    'due_on' => $date['due_on'],
                    'label' => $date['label'],
                    'amount' => -$part,
                ]);
                $byDate[$key]['available'] -= $part;
                $remaining -= $part;
            }

            if ($remaining > 0) {
                throw new BusinessConflict('discount_exceeds', 'La remise dépasse le montant restant de la facture.');
            }
        }
    }
}
