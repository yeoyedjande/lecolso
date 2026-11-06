<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Requests;

use App\Domains\Academic\Enums\SchoolEventKind;
use App\Domains\Academic\Models\Cycle;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Événement du calendrier : `title` (120), `kind`, `starts_on`, `ends_on` (≥ début, 366 jours au plus), `cycle_id`
 * (null : toute l'école), `location` (120). Droits vérifiés par le contrôleur (CalendarAccess).
 */
final class SaveSchoolEventRequest extends FormRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:2', 'max:120'],
            'kind' => ['required', Rule::enum(SchoolEventKind::class)],
            'starts_on' => ['required', 'date_format:Y-m-d'],
            'ends_on' => ['required', 'date_format:Y-m-d', 'after_or_equal:starts_on'],
            'cycle_id' => ['nullable', 'uuid'],
            'location' => ['nullable', 'string', 'max:120'],
        ];
    }

    /** Cycle visé, sous la RLS de l'école courante (autre école : erreur de validation). */
    public function cycleId(): ?string
    {
        if (! $this->filled('cycle_id')) {
            return null;
        }
        $cycle = Cycle::query()->find($this->string('cycle_id')->toString());

        return $cycle === null ? throw ValidationException::withMessages(['cycle_id' => 'Cycle inconnu.']) : $cycle->id;
    }

    /**
     * @return array{title: string, kind: SchoolEventKind, starts_on: string, ends_on: string, cycle_id: string|null, location: string|null}
     */
    public function attributes(): array
    {
        $location = trim($this->string('location')->toString());

        return [
            'title' => trim($this->string('title')->toString()),
            'kind' => SchoolEventKind::from($this->string('kind')->toString()),
            'starts_on' => $this->string('starts_on')->toString(),
            'ends_on' => $this->string('ends_on')->toString(),
            'cycle_id' => $this->cycleId(),
            'location' => $location === '' ? null : $location,
        ];
    }
}
