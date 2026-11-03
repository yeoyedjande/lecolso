<?php

declare(strict_types=1);

namespace App\Domains\Academic\Actions;

use App\Domains\Academic\Models\Cycle;
use App\Support\Cycles\CycleSettings;
use App\Support\Cycles\InvalidCycleSettings;
use Illuminate\Validation\ValidationException;

/** Renomme un cycle et/ou modifie ses paramètres (fusionnés avec les paramètres actuels, puis validés). */
final class UpdateCycle
{
    /**
     * @param  array<string, mixed>  $settings
     */
    public function handle(Cycle $cycle, ?string $name, array $settings): Cycle
    {
        if ($name !== null) {
            $cycle->name = $name;
        }

        if ($settings !== []) {
            try {
                $cycle->settings = CycleSettings::fromArray(array_merge($cycle->settings->toArray(), $settings));
            } catch (InvalidCycleSettings $exception) {
                throw ValidationException::withMessages(['settings' => $exception->getMessage()]);
            }
        }

        $cycle->save();

        return $cycle->load('levels');
    }
}
