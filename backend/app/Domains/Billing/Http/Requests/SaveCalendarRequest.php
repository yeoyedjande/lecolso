<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Billing\Support\DefaultCalendar;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use LogicException;

/**
 * Dates des échéances d'un cycle pour une année : autant de dates que la périodicité du cycle en prévoit (1, 3 ou 10),
 * croissantes, dans l'année scolaire. billing.manage sur le cycle.
 */
final class SaveCalendarRequest extends FormRequest
{
    use BillingYearRequest;

    public function authorize(): bool
    {
        $manageable = $this->cyclesFor('billing.manage');

        return $manageable === null || in_array($this->cycle()->id, $manageable, true);
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        $count = DefaultCalendar::count($this->cycle()->settings->billingPeriod);

        return [
            'academic_year_id' => ['nullable', 'uuid'],
            'dates' => ['required', 'array', 'size:'.$count],
            'dates.*.due_on' => ['required', 'date_format:Y-m-d'],
            'dates.*.label' => ['required', 'string', 'min:1', 'max:60'],
        ];
    }

    /**
     * @return list<callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $dates = $validator->getData()['dates'] ?? null;
                if (! is_array($dates) || $validator->errors()->isNotEmpty()) {
                    return;
                }

                $year = $this->year();
                $previous = null;
                foreach (array_values($dates) as $index => $date) {
                    $dueOn = is_array($date) && is_string($date['due_on'] ?? null) ? $date['due_on'] : '';
                    if ($dueOn < $year->starts_on->toDateString() || $dueOn > $year->ends_on->toDateString()) {
                        $validator->errors()->add("dates.{$index}.due_on", 'La date doit être comprise dans l’année scolaire.');
                    } elseif ($previous !== null && $dueOn <= $previous) {
                        $validator->errors()->add("dates.{$index}.due_on", 'Chaque échéance doit suivre la précédente.');
                    }
                    $previous = $dueOn;
                }
            },
        ];
    }

    public function cycle(): Cycle
    {
        $cycle = $this->route('cycle');

        return $cycle instanceof Cycle ? $cycle : throw new LogicException('Cycle de la route introuvable.');
    }

    /**
     * @return list<array{due_on: string, label: string}>
     */
    public function dates(): array
    {
        /** @var list<array{due_on: string, label: string}> $dates */
        $dates = $this->validated('dates');

        return array_map(static fn (array $date): array => ['due_on' => $date['due_on'], 'label' => trim($date['label'])], $dates);
    }
}
