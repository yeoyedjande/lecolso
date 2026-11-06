<?php

declare(strict_types=1);

namespace App\Domains\Grading\Actions;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Grading\Enums\Mention;
use App\Domains\Grading\Models\Appreciation;
use App\Domains\Grading\Models\SubjectAppreciation;
use App\Domains\Grading\Models\Term;
use App\Domains\Grading\Support\ClassroomGrading;
use App\Domains\Grading\Support\GradingAccess;
use App\Domains\Grading\Support\GradingCatalog;
use App\Domains\Grading\Support\GradingLock;
use App\Domains\Grading\Support\GradingRoster;
use App\Domains\Grading\Support\TermLock;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Appréciations d'un élève pour une période (décision du 06/11/2026) :
 * - titulaire ou direction (grades.manage) : appréciation générale et appréciations par matière ;
 * - direction (grades.validate) : observation et mention (null : mention proposée d'après la moyenne).
 * Un champ absent ne change pas ; un texte vide l'efface. Période validée : 409 term_closed.
 */
final readonly class SaveAppreciation
{
    public function __construct(
        private GradingAccess $access,
        private GradingCatalog $catalog,
        private ClassroomGrading $grading,
    ) {}

    /**
     * @param  array{teacher_comment?: string|null, subjects?: list<array{subject_id: string, comment: string|null}>, director_comment?: string|null, mention?: Mention|null}  $input
     *
     * @throws AuthorizationException
     * @throws BusinessConflict year_closed, term_closed
     * @throws ValidationException term_id, student_id, subjects
     */
    public function handle(User $user, Classroom $classroom, string $termId, string $studentId, array $input): Appreciation
    {
        $classroom->loadMissing(['level.cycle', 'academicYear']);
        $teacherPart = array_key_exists('teacher_comment', $input) || array_key_exists('subjects', $input);
        $directorPart = array_key_exists('director_comment', $input) || array_key_exists('mention', $input);
        if (($teacherPart && ! $this->access->canManage($user, $classroom)) || ($directorPart && ! $this->access->canValidate($user, $classroom))) {
            throw new AuthorizationException;
        }
        ClassroomGrading::assertOpen($classroom);
        $term = $this->grading->terms($classroom)->firstWhere('id', $termId)
            ?? throw ValidationException::withMessages(['term_id' => 'Période inconnue pour cette classe.']);
        TermLock::assertOpen($classroom->id, $term->id);
        if (! in_array($studentId, GradingRoster::of($classroom, $term)->modelKeys(), true)) {
            throw ValidationException::withMessages(['student_id' => 'Élève non inscrit dans cette classe pendant la période.']);
        }
        $subjects = $this->catalog->subjects($classroom->academicYear, $classroom->level)->modelKeys();
        foreach ($input['subjects'] ?? [] as $index => $row) {
            if (! in_array($row['subject_id'], $subjects, true)) {
                throw ValidationException::withMessages(["subjects.{$index}.subject_id" => 'Matière inconnue pour cette classe.']);
            }
        }

        return DB::transaction(function () use ($user, $classroom, $term, $studentId, $input): Appreciation {
            TermLock::guard($classroom->id, $term->id);
            GradingLock::acquire('appreciation', $term->id, $studentId);
            $appreciation = Appreciation::query()->where('term_id', $term->id)->where('student_id', $studentId)->first()
                ?? new Appreciation(['term_id' => $term->id, 'student_id' => $studentId]);
            if (array_key_exists('teacher_comment', $input)) {
                $appreciation->teacher_comment = self::text($input['teacher_comment']);
            }
            if (array_key_exists('director_comment', $input)) {
                $appreciation->director_comment = self::text($input['director_comment']);
            }
            if (array_key_exists('mention', $input)) {
                $appreciation->mention = $input['mention'];
                $appreciation->mention_chosen = $input['mention'] !== null;
            }
            $appreciation->updated_by = $user->id;
            $appreciation->save();

            foreach ($input['subjects'] ?? [] as $row) {
                $this->saveSubject($user, $term, $studentId, $row['subject_id'], self::text($row['comment']));
            }

            return $appreciation;
        });
    }

    private function saveSubject(User $user, Term $term, string $studentId, string $subjectId, ?string $comment): void
    {
        $existing = SubjectAppreciation::query()
            ->where('term_id', $term->id)
            ->where('student_id', $studentId)
            ->where('subject_id', $subjectId)
            ->first();
        if ($comment === null) {
            $existing?->delete();

            return;
        }
        ($existing ?? new SubjectAppreciation(['term_id' => $term->id, 'student_id' => $studentId, 'subject_id' => $subjectId]))
            ->fill(['comment' => $comment, 'updated_by' => $user->id])
            ->save();
    }

    private static function text(?string $value): ?string
    {
        $value = $value === null ? '' : trim($value);

        return $value === '' ? null : $value;
    }
}
