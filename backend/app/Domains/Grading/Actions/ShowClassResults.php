<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Data\ClassResultsView;
use App\Domains\Grading\Support\ClassroomGrading;
use App\Domains\Grading\Support\GradingCatalog;
use App\Domains\Grading\Support\GradingResults;
use App\Domains\Grading\Support\GradingRoster;
use Illuminate\Support\Carbon;

/** Résultats d'une classe pour une période : moyennes, rangs et statistiques, ou bilan des compétences. */
final readonly class ShowClassResults
{
    public function __construct(
        private GradingCatalog $catalog,
        private ClassroomGrading $grading,
        private GradingResults $results,
    ) {}

    public function handle(Classroom $classroom, ?string $termId, Carbon $now): ClassResultsView
    {
        $classroom->loadMissing(['level.cycle', 'academicYear']);
        $terms = $this->grading->terms($classroom);
        $term = $this->grading->pick($terms, $termId, $now);
        $subjects = $this->catalog->subjects($classroom->academicYear, $classroom->level);
        $students = GradingRoster::of($classroom, $term);

        return new ClassResultsView($classroom, $terms, $term, $subjects, $students, $this->results->compute($classroom, $term, $students, $subjects));
    }
}
