<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Grading\Models\Skill;
use App\Domains\Grading\Models\SkillEvaluation;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\GradingCatalog;
use App\Domains\Grading\Support\GradingLock;
use App\Domains\Identity\Models\User;
use App\Support\Cycles\Enums\AssessmentMode;
use App\Support\Http\BusinessConflict;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Référentiel de compétences d'un cycle pour une année (domaine, compétence), dans l'ordre donné. Une compétence
 * absente de la liste est retirée, sauf si elle a déjà été évaluée (409 skill_used). Cycles en compétences seulement.
 */
final readonly class SaveSkills
{
    public function __construct(
        private GradingAccess $access,
        private GradingCatalog $catalog,
    ) {}

    /**
     * @param  list<array{id: string|null, domain: string, label: string}>  $skills
     *
     * @throws AuthorizationException
     * @throws BusinessConflict year_closed, wrong_mode, skill_used
     * @throws ValidationException skills
     */
    public function handle(User $user, Cycle $cycle, AcademicYear $year, array $skills): void
    {
        if (! $this->access->canConfigure($user, $cycle->id)) {
            throw new AuthorizationException;
        }
        if ($year->status === AcademicYearStatus::Closed) {
            throw new BusinessConflict('year_closed', 'Cette année scolaire est clôturée.');
        }
        if ($cycle->settings->assessmentMode !== AssessmentMode::Competency) {
            throw new BusinessConflict('wrong_mode', 'Ce cycle n’est pas évalué par compétences.');
        }

        $this->catalog->skills($year, $cycle);
        DB::transaction(function () use ($cycle, $year, $skills): void {
            GradingLock::acquire('skills', $year->id, $cycle->id);
            $existing = Skill::query()->where('academic_year_id', $year->id)->where('cycle_id', $cycle->id)->get()->keyBy('id');
            $kept = [];
            foreach ($skills as $index => $data) {
                if ($data['id'] !== null && ! $existing->has($data['id'])) {
                    throw ValidationException::withMessages(["skills.{$index}.id" => 'Compétence inconnue pour ce cycle.']);
                }
                $skill = $data['id'] === null ? new Skill(['academic_year_id' => $year->id, 'cycle_id' => $cycle->id]) : $existing->get($data['id']);
                if (! $skill instanceof Skill) {
                    continue;
                }
                $skill->fill(['domain' => $data['domain'], 'label' => $data['label'], 'position' => $index + 1])->save();
                $kept[] = $skill->id;
            }

            $removed = array_values(array_diff(array_map(strval(...), $existing->keys()->all()), $kept));
            if ($removed !== [] && SkillEvaluation::query()->whereIn('skill_id', $removed)->exists()) {
                throw new BusinessConflict('skill_used', 'Une compétence retirée a déjà été évaluée : gardez-la.');
            }
            Skill::query()->whereKey($removed)->delete();
        });
    }
}
