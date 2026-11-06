<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Grading\Enums\Mention;
use App\Domains\Grading\Models\MentionThreshold;

/**
 * Mention proposée d'après la moyenne générale (décision du 06/11/2026) : seuils du cycle sur son échelle, sinon ceux de
 * config/grading.php (sur 10) ramenés sur l'échelle. Félicitations, tableau d'honneur, encouragements au-dessus de leur
 * seuil ; avertissement en dessous du sien ; sinon aucune. La direction peut choisir une autre mention.
 */
final class MentionPolicy
{
    /**
     * @return array{congratulations: float, honor_roll: float, encouragement: float, warning_below: float}
     */
    public static function thresholds(Cycle $cycle): array
    {
        $row = MentionThreshold::query()->where('cycle_id', $cycle->id)->first();
        if ($row !== null) {
            return [
                'congratulations' => (float) $row->congratulations,
                'honor_roll' => (float) $row->honor_roll,
                'encouragement' => (float) $row->encouragement,
                'warning_below' => (float) $row->warning_below,
            ];
        }

        $ratio = $cycle->settings->gradeScale->max() / 10;
        $defaults = config('grading.mentions');
        $value = static fn (string $key): float => round((is_array($defaults) && is_numeric($defaults[$key] ?? null) ? (float) $defaults[$key] : 0.0) * $ratio, 2);

        return [
            'congratulations' => $value('congratulations'),
            'honor_roll' => $value('honor_roll'),
            'encouragement' => $value('encouragement'),
            'warning_below' => $value('warning_below'),
        ];
    }

    /**
     * @param  array{congratulations: float, honor_roll: float, encouragement: float, warning_below: float}  $thresholds
     */
    public static function propose(?float $average, array $thresholds): ?Mention
    {
        return match (true) {
            $average === null => null,
            $average >= $thresholds['congratulations'] => Mention::Congratulations,
            $average >= $thresholds['honor_roll'] => Mention::HonorRoll,
            $average >= $thresholds['encouragement'] => Mention::Encouragement,
            $average < $thresholds['warning_below'] => Mention::Warning,
            default => null,
        };
    }
}
