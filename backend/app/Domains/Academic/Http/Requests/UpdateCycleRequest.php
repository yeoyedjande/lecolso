<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Requests;

use App\Domains\Academic\Models\Cycle;
use App\Support\Cycles\CycleSettings;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateCycleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->cycle()) === true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        $rules = [
            'name' => ['sometimes', 'string', 'min:2', 'max:100'],
            // Paramètres du cycle à modifier (les autres sont conservés) ; valeurs validées par CycleSettings
            'settings' => ['sometimes', 'array:'.implode(',', CycleSettings::KEYS)],
        ];

        foreach (CycleSettings::KEYS as $key) {
            $rules["settings.{$key}"] = ['sometimes', 'string'];
        }

        return $rules;
    }

    public function cycle(): Cycle
    {
        $cycle = $this->route('cycle');

        if (! $cycle instanceof Cycle) {
            throw new \LogicException('Paramètre de route {cycle} manquant.');
        }

        return $cycle;
    }

    public function name(): ?string
    {
        return $this->has('name') ? $this->string('name')->toString() : null;
    }

    /**
     * @return array<string, mixed>
     */
    public function settings(): array
    {
        $settings = [];

        foreach (CycleSettings::KEYS as $key) {
            if ($this->has("settings.{$key}")) {
                $settings[$key] = $this->validated("settings.{$key}");
            }
        }

        return $settings;
    }
}
