<?php

declare(strict_types=1);

namespace App\Domains\Grading\Support;

use App\Domains\Attendance\Enums\AttendanceStatus;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Grading\Data\ClassResults;
use App\Domains\Grading\Enums\Mention;
use App\Domains\Grading\Models\Appreciation;
use App\Domains\Grading\Models\Skill;
use App\Domains\Grading\Models\SkillEvaluation;
use App\Domains\Grading\Models\Subject;
use App\Domains\Grading\Models\SubjectAppreciation;
use App\Domains\Grading\Models\Term;
use App\Domains\Grading\Models\TermClosure;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use App\Support\Cycles\Enums\ReportDocument;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;
use Illuminate\Database\Eloquent\Collection;

/**
 * Données des bulletins d'une classe pour une période validée, pour le gabarit du document du cycle (`report_document` :
 * bulletin de notes ou livret de compétences). Tout est figé à la validation : résultats, mentions, appréciations.
 */
final readonly class ReportCardBuilder
{
    public function __construct(
        private GradingCatalog $catalog,
        private GradingResults $results,
        private Filesystems $filesystems,
    ) {}

    /**
     * @return array{template: string, students: array<string, array<string, mixed>>}
     */
    public function build(School $school, TermClosure $closure): array
    {
        $closure->loadMissing(['classroom.level.cycle', 'classroom.academicYear', 'classroom.homeroomTeacher', 'term']);
        $classroom = $closure->classroom;
        $term = $closure->term;
        $settings = $classroom->level->cycle->settings;
        $students = GradingRoster::of($classroom, $term);
        $subjects = $this->catalog->subjects($classroom->academicYear, $classroom->level);
        $results = $this->results->compute($classroom, $term, $students, $subjects);
        $template = $settings->reportDocument === ReportDocument::SkillsBooklet ? 'skills_booklet' : 'report_card';

        $common = [
            'school' => [
                'name' => $school->name,
                'address' => $school->address,
                'city' => $school->city,
                'phone' => $school->phone,
                'motto' => $school->motto,
                'logo' => $this->logo($school),
            ],
            'year' => $classroom->academicYear->label,
            'term' => $term->label,
            'classroom' => $classroom->name(),
            'teacher' => $classroom->homeroomTeacher?->name,
            'scale' => $settings->gradeScale->max(),
            'class_size' => $students->count(),
            'class_average' => $results->classAverage,
            'highest' => $results->highest,
            'lowest' => $results->lowest,
            'validated_by' => $closure->closed_by_name,
            'validated_on' => $closure->closed_at->timezone(config()->string('app.display_timezone'))->format('d/m/Y'),
        ];

        $appreciations = Appreciation::query()->where('term_id', $term->id)->get()->keyBy('student_id');
        $comments = SubjectAppreciation::query()->where('term_id', $term->id)->get()->groupBy('student_id');
        $absences = $this->absences($students, $term);
        $skills = $template === 'skills_booklet' ? $this->catalog->skills($classroom->academicYear, $classroom->level->cycle) : new Collection;
        $levels = $template === 'skills_booklet' ? $this->levels($term, $students) : [];

        $documents = [];
        foreach ($students as $student) {
            $result = $results->for($student->id);
            $appreciation = $appreciations->get($student->id);
            $subjectComments = [];
            foreach ($comments->get($student->id) ?? [] as $comment) {
                $subjectComments[$comment->subject_id] = $comment->comment;
            }
            $documents[$student->id] = [
                ...$common,
                'student' => [
                    'name' => $student->fullName(),
                    'matricule' => $student->matricule,
                    'birth_date' => $student->birth_date->format('d/m/Y'),
                ],
                'absences' => $absences[$student->id]['absent'] ?? 0,
                'lates' => $absences[$student->id]['late'] ?? 0,
                'subjects' => $subjects->map(static fn (Subject $subject): array => [
                    'name' => $subject->name,
                    'coefficient' => $subject->coefficient,
                    'average' => $result?->subjects[$subject->id] ?? null,
                    'comment' => $subjectComments[$subject->id] ?? null,
                ])->values()->all(),
                'average' => $result?->average,
                'rank' => self::rank($results, $result?->rank),
                'mention' => $appreciation?->mention instanceof Mention ? $appreciation->mention->label() : null,
                'teacher_comment' => $appreciation?->teacher_comment,
                'director_comment' => $appreciation?->director_comment,
                'domains' => self::domains($skills, $levels[$student->id] ?? []),
            ];
        }

        return ['template' => $template, 'students' => $documents];
    }

    /** « 1er », « 2e ex æquo » ; sans moyenne : null. */
    private static function rank(ClassResults $results, ?int $rank): ?string
    {
        if ($rank === null) {
            return null;
        }
        $tied = count(array_filter($results->students, static fn ($other): bool => $other->rank === $rank)) > 1;

        return ($rank === 1 ? '1er' : $rank.'e').($tied ? ' ex æquo' : '');
    }

    /**
     * @param  Collection<int, Skill>  $skills
     * @param  array<string, string>  $levels  compétence → A, EA, NA
     * @return list<array{name: string, skills: list<array{label: string, level: string|null}>}>
     */
    private static function domains(Collection $skills, array $levels): array
    {
        $domains = [];
        foreach ($skills as $skill) {
            $last = array_key_last($domains);
            if ($last === null || $domains[$last]['name'] !== $skill->domain) {
                $domains[] = ['name' => $skill->domain, 'skills' => []];
                $last = array_key_last($domains);
            }
            $domains[$last]['skills'][] = ['label' => $skill->label, 'level' => $levels[$skill->id] ?? null];
        }

        return $domains;
    }

    /**
     * @param  Collection<int, Student>  $students
     * @return array<string, array<string, string>>
     */
    private function levels(Term $term, Collection $students): array
    {
        $levels = [];
        foreach (SkillEvaluation::query()->where('term_id', $term->id)->whereIn('student_id', $students->modelKeys())->whereNotNull('level')->get() as $evaluation) {
            if ($evaluation->level !== null) {
                $levels[$evaluation->student_id][$evaluation->skill_id] = $evaluation->level->value;
            }
        }

        return $levels;
    }

    /**
     * Absences et retards de la période (lecture du domaine Attendance).
     *
     * @param  Collection<int, Student>  $students
     * @return array<string, array{absent: int, late: int}>
     */
    private function absences(Collection $students, Term $term): array
    {
        $counts = [];
        $marks = AttendanceMark::query()
            ->whereIn('student_id', $students->modelKeys())
            ->whereBetween('date', [$term->starts_on->toDateString(), $term->ends_on->toDateString()])
            ->get();
        foreach ($marks as $mark) {
            $counts[$mark->student_id] ??= ['absent' => 0, 'late' => 0];
            $counts[$mark->student_id][$mark->status === AttendanceStatus::Late ? 'late' : 'absent']++;
        }

        return $counts;
    }

    /** Logo de l'école en ligne (data URI) : Gotenberg ne charge aucune ressource externe. */
    private function logo(School $school): ?string
    {
        if ($school->logo_path === null) {
            return null;
        }
        $bytes = $this->filesystems->disk()->get($school->logo_path);

        return $bytes === null ? null : 'data:image/webp;base64,'.base64_encode($bytes);
    }
}
