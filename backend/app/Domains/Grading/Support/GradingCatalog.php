<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Academic\Models\Level;
use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Models\Skill;
use App\Domains\Grading\Models\SkillEvaluation;
use App\Domains\Grading\Models\Subject;
use App\Domains\Grading\Models\Term;
use App\Support\Cycles\Enums\AssessmentMode;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Périodes, matières et référentiel de compétences d'une année, créés à la première lecture :
 * - périodes d'après term_type du cycle (DefaultTerms), recréées si le type a changé et qu'aucune évaluation ne
 *   les utilise ;
 * - matières des niveaux des cycles en moyenne pondérée et compétences des cycles en compétences, depuis
 *   config/grading.php (la direction les modifie ensuite).
 * Un verrou consultatif transactionnel évite qu'une double première lecture crée deux fois la liste.
 */
final class GradingCatalog
{
    /**
     * @return Collection<int, Term>
     */
    public function terms(AcademicYear $year, Cycle $cycle): Collection
    {
        $type = $cycle->settings->termType;
        $terms = $this->termQuery($year, $cycle)->get();
        if ($terms->count() === DefaultTerms::count($type)) {
            return $terms;
        }

        return DB::transaction(function () use ($year, $cycle, $type): Collection {
            GradingLock::acquire('terms', $year->id, $cycle->id);
            $terms = $this->termQuery($year, $cycle)->get();
            if ($terms->count() === DefaultTerms::count($type)) {
                return $terms;
            }
            // Type de période changé : la liste n'est remplacée que si rien ne s'y rattache
            if ($terms->isNotEmpty() && $this->termsUsed(array_values(array_map(strval(...), $terms->modelKeys())))) {
                return $terms;
            }
            // Évaluations de compétences effacées : seules leurs dates restaient
            SkillEvaluation::query()->whereIn('term_id', $terms->modelKeys())->whereNull('level')->delete();
            Term::query()->whereKey($terms->modelKeys())->delete();
            foreach (DefaultTerms::for($type, CarbonImmutable::parse($year->starts_on), CarbonImmutable::parse($year->ends_on)) as $term) {
                Term::query()->create([...$term, 'academic_year_id' => $year->id, 'cycle_id' => $cycle->id]);
            }

            return $this->termQuery($year, $cycle)->get();
        });
    }

    /**
     * @return Collection<int, Subject>
     */
    public function subjects(AcademicYear $year, Level $level): Collection
    {
        $subjects = $this->subjectQuery($year, $level)->get();
        if ($subjects->isNotEmpty() || $level->cycle->settings->assessmentMode !== AssessmentMode::WeightedAverage) {
            return $subjects;
        }

        return DB::transaction(function () use ($year, $level): Collection {
            GradingLock::acquire('subjects', $year->id, $level->id);
            if ($this->subjectQuery($year, $level)->exists()) {
                return $this->subjectQuery($year, $level)->get();
            }
            foreach (self::defaults('subjects') as $position => $subject) {
                Subject::query()->create([
                    'academic_year_id' => $year->id,
                    'level_id' => $level->id,
                    'name' => self::text($subject, 'name'),
                    'coefficient' => is_int($subject['coefficient'] ?? null) ? $subject['coefficient'] : 1,
                    'position' => $position + 1,
                ]);
            }

            return $this->subjectQuery($year, $level)->get();
        });
    }

    /**
     * @return Collection<int, Skill>
     */
    public function skills(AcademicYear $year, Cycle $cycle): Collection
    {
        $skills = $this->skillQuery($year, $cycle)->get();
        if ($skills->isNotEmpty() || $cycle->settings->assessmentMode !== AssessmentMode::Competency) {
            return $skills;
        }

        return DB::transaction(function () use ($year, $cycle): Collection {
            GradingLock::acquire('skills', $year->id, $cycle->id);
            if ($this->skillQuery($year, $cycle)->exists()) {
                return $this->skillQuery($year, $cycle)->get();
            }
            foreach (self::defaults('skills') as $position => $skill) {
                Skill::query()->create([
                    'academic_year_id' => $year->id,
                    'cycle_id' => $cycle->id,
                    'domain' => self::text($skill, 'domain'),
                    'label' => self::text($skill, 'label'),
                    'position' => $position + 1,
                ]);
            }

            return $this->skillQuery($year, $cycle)->get();
        });
    }

    /**
     * @param  list<string>  $termIds
     */
    public function termsUsed(array $termIds): bool
    {
        return Assessment::query()->whereIn('term_id', $termIds)->exists()
            || SkillEvaluation::query()->whereIn('term_id', $termIds)->whereNotNull('level')->exists();
    }

    /**
     * @return Builder<Term>
     */
    private function termQuery(AcademicYear $year, Cycle $cycle): Builder
    {
        return Term::query()->where('academic_year_id', $year->id)->where('cycle_id', $cycle->id)->orderBy('position');
    }

    /**
     * @return Builder<Subject>
     */
    private function subjectQuery(AcademicYear $year, Level $level): Builder
    {
        return Subject::query()->where('academic_year_id', $year->id)->where('level_id', $level->id)->orderBy('position');
    }

    /**
     * @return Builder<Skill>
     */
    private function skillQuery(AcademicYear $year, Cycle $cycle): Builder
    {
        return Skill::query()->where('academic_year_id', $year->id)->where('cycle_id', $cycle->id)->orderBy('position');
    }

    /**
     * @return list<array<array-key, mixed>>
     */
    private static function defaults(string $key): array
    {
        $items = config('grading.'.$key);

        return is_array($items) ? array_values(array_filter($items, is_array(...))) : [];
    }

    /**
     * @param  array<array-key, mixed>  $item
     */
    private static function text(array $item, string $key): string
    {
        $value = $item[$key] ?? null;

        return is_string($value) ? $value : '';
    }
}
