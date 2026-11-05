<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Enums\FeeBilling;
use App\Domains\Billing\Enums\LineKind;
use App\Domains\Billing\Models\FeeSchedule;
use App\Domains\Billing\Models\FeeType;
use App\Domains\Billing\Models\Installment;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Models\InvoiceLine;
use App\Domains\Billing\Support\Amount;
use App\Domains\Billing\Support\BillingCalendar;
use App\Domains\Billing\Support\InvoiceSchedule;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Modifications d'une facture après son émission (la grille n'est jamais réappliquée aux factures existantes) :
 * service optionnel ajouté ou retiré en cours d'année, ligne ajoutée à la main, remise (direction), retrait d'une
 * ligne manuelle ou d'une remise. Les remises sont réparties de nouveau après chaque changement.
 */
final readonly class ManageInvoiceLines
{
    public function __construct(private BillingCalendar $calendar) {}

    /**
     * Ajoute un service optionnel à partir d'une date (aujourd'hui par défaut) : périodes restantes seulement.
     *
     * @throws BusinessConflict option_present, no_amount
     */
    public function addOption(Invoice $invoice, FeeType $type, Carbon $from): Invoice
    {
        if (InvoiceLine::query()->where('invoice_id', $invoice->id)->where('fee_type_id', $type->id)->exists()) {
            throw new BusinessConflict('option_present', 'Ce service figure déjà sur la facture.');
        }

        $invoice->loadMissing(['enrollment.classroom.level.cycle', 'academicYear']);
        $level = $invoice->enrollment->classroom->level;
        $amount = Amount::of(FeeSchedule::query()
            ->where('academic_year_id', $invoice->academic_year_id)
            ->where('level_id', $level->id)
            ->where('fee_type_id', $type->id)
            ->value('amount'));

        if ($amount <= 0) {
            throw new BusinessConflict('no_amount', 'Aucun montant n’est fixé pour ce service à ce niveau dans la grille de frais.');
        }

        return DB::transaction(function () use ($invoice, $type, $amount, $from, $level): Invoice {
            $shares = $type->billing === FeeBilling::Once
                ? [['due_on' => $from->toDateString(), 'label' => $type->name, 'amount' => $amount]]
                : InvoiceSchedule::remainingShares($amount, $this->calendar->datesFor($invoice->academicYear, $level->cycle), $from);

            InvoiceSchedule::addLine($invoice, ['fee_type_id' => $type->id, 'kind' => LineKind::Fee, 'label' => $type->name], $shares);
            InvoiceSchedule::rebalanceDiscounts($invoice);

            return $invoice;
        });
    }

    /**
     * Retire un service optionnel : les échéances des périodes qui n'ont pas commencé disparaissent, celles déjà
     * commencées restent dues.
     *
     * @throws BusinessConflict not_optional
     */
    public function removeOption(Invoice $invoice, FeeType $type, Carbon $from): Invoice
    {
        if (! $type->is_optional) {
            throw new BusinessConflict('not_optional', 'Seul un service optionnel peut être retiré.');
        }

        $line = InvoiceLine::query()->where('invoice_id', $invoice->id)->where('fee_type_id', $type->id)->first();
        if ($line === null) {
            return $invoice;
        }

        return DB::transaction(static function () use ($invoice, $line, $from): Invoice {
            Installment::query()->where('invoice_line_id', $line->id)->where('due_on', '>', $from->toDateString())->delete();
            $kept = Amount::of(Installment::query()->where('invoice_line_id', $line->id)->sum('amount'));

            $kept > 0 ? $line->fill(['amount' => $kept])->save() : $line->delete();
            InvoiceSchedule::rebalanceDiscounts($invoice);

            return $invoice;
        });
    }

    /** Ligne ajoutée à la main (fournitures, sortie…), due à une date. */
    public function addManual(Invoice $invoice, User $author, string $label, int $amount, Carbon $dueOn): Invoice
    {
        return DB::transaction(static function () use ($invoice, $author, $label, $amount, $dueOn): Invoice {
            InvoiceSchedule::addLine($invoice, [
                'kind' => LineKind::Manual,
                'label' => $label,
                'created_by' => $author->id,
            ], [['due_on' => $dueOn->toDateString(), 'label' => $label, 'amount' => $amount]]);
            InvoiceSchedule::rebalanceDiscounts($invoice);

            return $invoice;
        });
    }

    /**
     * Remise (montant positif saisi, ligne négative) avec son motif ; répartie à partir de la dernière échéance.
     *
     * @throws BusinessConflict discount_exceeds
     */
    public function addDiscount(Invoice $invoice, User $author, int $amount, string $reason): Invoice
    {
        return DB::transaction(static function () use ($invoice, $author, $amount, $reason): Invoice {
            InvoiceLine::query()->create([
                'invoice_id' => $invoice->id,
                'kind' => LineKind::Discount,
                'label' => 'Remise',
                'amount' => -$amount,
                'reason' => $reason,
                'created_by' => $author->id,
            ]);
            InvoiceSchedule::rebalanceDiscounts($invoice);

            return $invoice;
        });
    }

    /**
     * Retire une ligne manuelle ou une remise (les frais de la grille se retirent comme service optionnel).
     *
     * @throws ValidationException ligne de frais de la grille
     */
    public function removeLine(Invoice $invoice, InvoiceLine $line): Invoice
    {
        if ($line->kind === LineKind::Fee) {
            throw ValidationException::withMessages(['line' => 'Les frais de la grille ne se retirent pas : retirez le service, ou ajoutez une remise.']);
        }

        return DB::transaction(static function () use ($invoice, $line): Invoice {
            $line->delete();
            InvoiceSchedule::rebalanceDiscounts($invoice);

            return $invoice;
        });
    }
}
