<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Grading\Models\Assessment;
use App\Domains\Grading\Models\Grade;
use App\Domains\Grading\Support\ClassroomGrading;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\GradingLock;
use App\Domains\Grading\Support\GradingRoster;
use App\Domains\Grading\Support\TermLock;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Notes d'une évaluation : pour chaque élève de la période, une note (0 au barème, 2 décimales), « absent », ou rien
 * (note effacée : non saisie). Les élèves absents de la liste ne changent pas. Saisie hors connexion (`recordedAt`) :
 * la note est datée de sa saisie sur l'appareil, et une note saisie plus récemment est gardée (la plus récente gagne).
 */
final readonly class SaveGrades
{
    public function __construct(private GradingAccess $access) {}

    /**
     * @param  list<array{student_id: string, value: float|null, absent: bool}>  $grades
     *
     * @throws AuthorizationException
     * @throws BusinessConflict year_closed, term_closed
     * @throws ValidationException grades
     */
    public function handle(User $user, Assessment $assessment, array $grades, ?Carbon $recordedAt = null): void
    {
        $assessment->loadMissing(['classroom.level.cycle', 'classroom.academicYear', 'term']);
        $classroom = $assessment->classroom;
        if (! $this->access->canManage($user, $classroom)) {
            throw new AuthorizationException;
        }
        ClassroomGrading::assertOpen($classroom);
        TermLock::assertOpen($classroom->id, $assessment->term_id);

        $roster = GradingRoster::of($classroom, $assessment->term)->modelKeys();
        foreach ($grades as $index => $grade) {
            if (! in_array($grade['student_id'], $roster, true)) {
                throw ValidationException::withMessages(["grades.{$index}.student_id" => 'Élève non inscrit dans cette classe pendant la période.']);
            }
            if ($grade['value'] !== null && ($grade['absent'] || $grade['value'] < 0 || $grade['value'] > $assessment->out_of)) {
                throw ValidationException::withMessages(["grades.{$index}.value" => "La note doit être comprise entre 0 et {$assessment->out_of}."]);
            }
        }

        DB::transaction(function () use ($user, $classroom, $assessment, $grades, $recordedAt): void {
            TermLock::guard($classroom->id, $assessment->term_id);
            GradingLock::acquire('grades', $assessment->id);
            $existing = Grade::query()->where('assessment_id', $assessment->id)->get()->keyBy('student_id');
            foreach ($grades as $data) {
                $grade = $existing->get($data['student_id']);
                if ($grade instanceof Grade && $recordedAt !== null && $grade->updated_at !== null && $grade->updated_at->gt($recordedAt)) {
                    continue;
                }
                if ($grade === null && $data['value'] === null && ! $data['absent']) {
                    continue;
                }
                // Une note effacée garde sa ligne (valeur et absence vides) : sa date protège l'effacement
                $grade ??= new Grade(['assessment_id' => $assessment->id, 'student_id' => $data['student_id']]);
                $grade->fill([
                    'value' => $data['absent'] || $data['value'] === null ? null : number_format($data['value'], 2, '.', ''),
                    'absent' => $data['absent'],
                    'entered_by' => $user->id,
                ]);
                if ($recordedAt !== null) {
                    // Datée de sa saisie sur l'appareil (jamais dans le futur) : la plus récente gagne
                    $grade->updated_at = $recordedAt->min(Carbon::now());
                }
                $grade->save();
            }
        });
    }
}
