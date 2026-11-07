<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Level;
use App\Domains\Billing\Data\PublicFeeGrid;
use App\Domains\Billing\Models\FeeSchedule;
use App\Domains\Billing\Models\FeeType;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;

/**
 * Tarifs de la page publique, si l'école a choisi de les publier (`schools.settings.public_fees`) : grille de l'année
 * en cours, par niveau des cycles actifs. Lecture sans connexion : école retrouvée par `public_school_id`, puis
 * lecture sous la RLS de cette école (aucune donnée personnelle).
 *
 * @phpstan-type Result PublicFeeGrid|false|null
 */
final readonly class ShowPublicFees
{
    public function __construct(private TenantContext $context) {}

    /**
     * @return PublicFeeGrid|false|null null : école inconnue (404) ; false : tarifs non publiés
     */
    public function handle(string $slug): PublicFeeGrid|false|null
    {
        // SQL brut justifié : fonction SECURITY DEFINER qui ne renvoie que l'identifiant de l'école du slug
        $schoolId = DB::connection(TenantContext::CONNECTION)->scalar('select public_school_id(?)', [$slug]);
        if (! is_string($schoolId)) {
            return null;
        }

        return $this->context->run($schoolId, function (): PublicFeeGrid|false {
            $school = $this->context->school();
            $year = AcademicYear::query()->where('is_current', true)->first();
            if ($school === null || ($school->settings['public_fees'] ?? false) !== true || $year === null) {
                return false;
            }

            $schedules = FeeSchedule::query()->where('academic_year_id', $year->id)->where('amount', '>', 0)->get();
            $types = FeeType::query()->whereIn('id', $schedules->pluck('fee_type_id')->unique())->orderBy('position')->get();
            $codes = $types->pluck('code', 'id');
            $levels = Level::query()
                ->whereHas('cycle', static fn ($cycle) => $cycle->where('is_active', true))
                ->with('cycle')
                ->get()
                ->sortBy([static fn (Level $a, Level $b): int => $a->cycle->position <=> $b->cycle->position, static fn (Level $a, Level $b): int => $a->position <=> $b->position])
                ->values();

            return new PublicFeeGrid(
                $year->label,
                array_values($types->map(static fn (FeeType $type): array => ['code' => $type->code, 'name' => $type->name, 'optional' => $type->is_optional])->all()),
                array_values($levels->map(static function (Level $level) use ($schedules, $codes): array {
                    $amounts = [];
                    foreach ($schedules->where('level_id', $level->id) as $schedule) {
                        $code = $codes->get($schedule->fee_type_id);
                        if (is_string($code)) {
                            $amounts[$code] = (int) $schedule->amount;
                        }
                    }

                    return ['cycle_name' => $level->cycle->name, 'level_code' => $level->code, 'level_name' => $level->name, 'amounts' => $amounts];
                })->all()),
            );
        });
    }
}
