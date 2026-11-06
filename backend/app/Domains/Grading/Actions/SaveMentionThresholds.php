<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Models\Cycle;
use App\Domains\Grading\Models\MentionThreshold;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

/**
 * Seuils des mentions proposées d'un cycle, sur son échelle (school.settings.manage sur le cycle) : félicitations ≥
 * tableau d'honneur ≥ encouragements ≥ seuil de l'avertissement. Les bulletins déjà validés ne changent pas.
 */
final readonly class SaveMentionThresholds
{
    public function __construct(private GradingAccess $access) {}

    /**
     * @param  array{congratulations: float, honor_roll: float, encouragement: float, warning_below: float}  $values
     *
     * @throws AuthorizationException
     * @throws ValidationException
     */
    public function handle(User $user, Cycle $cycle, array $values): MentionThreshold
    {
        if (! $this->access->canConfigure($user, $cycle->id)) {
            throw new AuthorizationException;
        }
        $max = $cycle->settings->gradeScale->max();
        foreach ($values as $key => $value) {
            if ($value < 0 || $value > $max) {
                throw ValidationException::withMessages([$key => "Seuil entre 0 et {$max}."]);
            }
        }
        if (! ($values['warning_below'] <= $values['encouragement'] && $values['encouragement'] <= $values['honor_roll'] && $values['honor_roll'] <= $values['congratulations'])) {
            throw ValidationException::withMessages(['honor_roll' => 'Les seuils doivent aller de l’avertissement aux félicitations, dans cet ordre.']);
        }

        $row = MentionThreshold::query()->where('cycle_id', $cycle->id)->first() ?? new MentionThreshold(['cycle_id' => $cycle->id]);
        $row->fill(array_map(static fn (float $value): string => number_format($value, 2, '.', ''), $values))->save();

        return $row;
    }
}
