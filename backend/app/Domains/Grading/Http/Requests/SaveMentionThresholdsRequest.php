<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

use App\Domains\Academic\Models\Cycle;
use Illuminate\Foundation\Http\FormRequest;
use LogicException;

/**
 * Seuils des mentions d'un cycle, sur son échelle (2 décimales) : `congratulations`, `honor_roll`, `encouragement`
 * (au moins) et `warning_below` (en dessous). school.settings.manage sur le cycle, contrôlé par l'Action.
 */
final class SaveMentionThresholdsRequest extends FormRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        $rule = ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:20'];

        return ['congratulations' => $rule, 'honor_roll' => $rule, 'encouragement' => $rule, 'warning_below' => $rule];
    }

    public function cycle(): Cycle
    {
        $cycle = $this->route('cycle');

        return $cycle instanceof Cycle ? $cycle : throw new LogicException('Cycle de la route introuvable.');
    }

    /**
     * @return array{congratulations: float, honor_roll: float, encouragement: float, warning_below: float}
     */
    public function thresholds(): array
    {
        return [
            'congratulations' => (float) $this->float('congratulations'),
            'honor_roll' => (float) $this->float('honor_roll'),
            'encouragement' => (float) $this->float('encouragement'),
            'warning_below' => (float) $this->float('warning_below'),
        ];
    }
}
