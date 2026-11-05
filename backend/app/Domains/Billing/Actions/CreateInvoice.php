<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Billing\Enums\FeeBilling;
use App\Domains\Billing\Enums\LineKind;
use App\Domains\Billing\Models\FeeSchedule;
use App\Domains\Billing\Models\FeeType;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Support\Amount;
use App\Domains\Billing\Support\BillingCalendar;
use App\Domains\Billing\Support\InvoiceSchedule;
use App\Domains\Billing\Support\PayerDirectory;
use App\Domains\Students\Models\Enrollment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Facture d'une inscription, d'après la grille de frais du niveau pour l'année :
 * - frais en une fois (inscription) : dus en entier à la date d'inscription ;
 * - frais répartis (scolarité, services choisis) : échéances restantes du calendrier du cycle (inscription en cours
 *   d'année : les périodes terminées ne sont pas facturées).
 * Idempotente : une inscription qui a déjà sa facture la garde. Un montant à 0 dans la grille ne crée pas de ligne.
 */
final readonly class CreateInvoice
{
    public function __construct(
        private BillingCalendar $calendar,
        private PayerDirectory $payers,
    ) {}

    /**
     * @param  list<string>  $optionCodes  codes des services optionnels choisis (cantine, transport…)
     *
     * @throws ValidationException service inconnu ou non optionnel (champ `options`)
     */
    public function handle(Enrollment $enrollment, array $optionCodes = []): Invoice
    {
        $existing = Invoice::query()->where('enrollment_id', $enrollment->id)->first();
        if ($existing !== null) {
            return $existing;
        }

        $types = FeeType::query()->orderBy('position')->get();
        $optional = $types->filter(static fn (FeeType $type): bool => $type->is_optional)->map(static fn (FeeType $type): string => $type->code)->all();
        $unknown = array_diff($optionCodes, $optional);
        if ($unknown !== []) {
            throw ValidationException::withMessages(['options' => 'Service inconnu : '.implode(', ', $unknown).'.']);
        }

        return DB::transaction(function () use ($enrollment, $types, $optionCodes): Invoice {
            $enrollment->loadMissing(['classroom.level.cycle', 'academicYear']);
            $level = $enrollment->classroom->level;
            $invoice = Invoice::query()->create([
                'enrollment_id' => $enrollment->id,
                'student_id' => $enrollment->student_id,
                'academic_year_id' => $enrollment->academic_year_id,
                'payer_id' => $this->payers->forStudent($enrollment->student_id)?->id,
            ]);

            $amounts = Amount::byFeeType(FeeSchedule::query()
                ->where('academic_year_id', $enrollment->academic_year_id)
                ->where('level_id', $level->id)
                ->get());
            $dates = $this->calendar->datesFor($enrollment->academicYear, $level->cycle);
            $from = $enrollment->enrolled_on->greaterThan($enrollment->academicYear->starts_on)
                ? $enrollment->enrolled_on
                : $enrollment->academicYear->starts_on;

            foreach ($types as $type) {
                $amount = $amounts[$type->id] ?? 0;
                if ($amount <= 0 || ($type->is_optional && ! in_array($type->code, $optionCodes, true))) {
                    continue;
                }

                $shares = $type->billing === FeeBilling::Once
                    ? [['due_on' => $from->toDateString(), 'label' => $type->name, 'amount' => $amount]]
                    : InvoiceSchedule::remainingShares($amount, $dates, $from);

                InvoiceSchedule::addLine($invoice, [
                    'fee_type_id' => $type->id,
                    'kind' => LineKind::Fee,
                    'label' => $type->name,
                ], $shares);
            }

            return $invoice;
        });
    }
}
