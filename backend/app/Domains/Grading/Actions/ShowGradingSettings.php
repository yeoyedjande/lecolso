<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Academic\Models\Level;
use App\Domains\Grading\Data\GradingSettingsView;
use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Models\SkillEvaluation;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\GradingCatalog;
use App\Domains\Identity\Models\User;
use App\Support\Cycles\Enums\AssessmentMode;

/** Réglages des notes d'un cycle pour une année (créés à la première lecture d'après les listes par défaut). */
final readonly class ShowGradingSettings
{
    public function __construct(
        private GradingCatalog $catalog,
        private GradingAccess $access,
    ) {}

    public function handle(User $user, Cycle $cycle, AcademicYear $year): GradingSettingsView
    {
        $terms = $this->catalog->terms($year, $cycle);
        $mode = $cycle->settings->assessmentMode;

        $levels = [];
        $subjectIds = [];
        if ($mode === AssessmentMode::WeightedAverage) {
            foreach (Level::query()->where('cycle_id', $cycle->id)->orderBy('position')->get() as $level) {
                $level->setRelation('cycle', $cycle);
                $subjects = $this->catalog->subjects($year, $level);
                $subjectIds = [...$subjectIds, ...$subjects->modelKeys()];
                $levels[] = ['level' => $level, 'subjects' => $subjects];
            }
        }
        $skills = $this->catalog->skills($year, $cycle);

        $used = [];
        $termIds = $terms->modelKeys();
        $ids = [
            ...Assessment::query()->whereIn('term_id', $termIds)->distinct()->pluck('term_id')->all(),
            ...Assessment::query()->whereIn('subject_id', $subjectIds)->distinct()->pluck('subject_id')->all(),
            ...SkillEvaluation::query()->whereIn('term_id', $termIds)->distinct()->pluck('term_id')->all(),
            ...SkillEvaluation::query()->whereIn('skill_id', $skills->modelKeys())->distinct()->pluck('skill_id')->all(),
        ];
        foreach ($ids as $id) {
            if (is_string($id)) {
                $used[$id] = true;
            }
        }

        return new GradingSettingsView(
            $cycle,
            $year,
            $terms,
            $levels,
            $skills,
            $used,
            $year->status === AcademicYearStatus::Open && $this->access->canConfigure($user, $cycle->id),
        );
    }
}
