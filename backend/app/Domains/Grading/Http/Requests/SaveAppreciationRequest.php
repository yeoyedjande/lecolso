<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Requests;

use App\Domains\Grading\Enums\Mention;
use Illuminate\Validation\Rule;

/**
 * Appréciations d'un élève pour une période : `term_id`, `student_id` ; titulaire ou direction : `teacher_comment`,
 * `subjects` (matière, appréciation ; vide : effacée) ; direction : `director_comment`, `mention` (null : proposée
 * d'après la moyenne). Un champ absent ne change pas. Droits contrôlés par l'Action.
 */
final class SaveAppreciationRequest extends GradingClassroomRequest
{
    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'term_id' => ['required', 'uuid'],
            'student_id' => ['required', 'uuid'],
            'teacher_comment' => ['sometimes', 'nullable', 'string', 'max:500'],
            'director_comment' => ['sometimes', 'nullable', 'string', 'max:500'],
            'mention' => ['sometimes', 'nullable', Rule::enum(Mention::class)],
            'subjects' => ['sometimes', 'array', 'max:30'],
            'subjects.*.subject_id' => ['required', 'uuid', 'distinct'],
            'subjects.*.comment' => ['present', 'nullable', 'string', 'max:200'],
        ];
    }

    /**
     * @return array{teacher_comment?: string|null, subjects?: list<array{subject_id: string, comment: string|null}>, director_comment?: string|null, mention?: Mention|null}
     */
    public function appreciation(): array
    {
        $data = $this->validated();
        $input = [];
        if (array_key_exists('teacher_comment', $data)) {
            $input['teacher_comment'] = is_string($data['teacher_comment']) ? $data['teacher_comment'] : null;
        }
        if (array_key_exists('director_comment', $data)) {
            $input['director_comment'] = is_string($data['director_comment']) ? $data['director_comment'] : null;
        }
        if (array_key_exists('mention', $data)) {
            $input['mention'] = is_string($data['mention']) ? Mention::from($data['mention']) : null;
        }
        if (array_key_exists('subjects', $data) && is_array($data['subjects'])) {
            $subjects = [];
            foreach ($data['subjects'] as $row) {
                if (is_array($row) && is_string($row['subject_id'] ?? null)) {
                    $subjects[] = ['subject_id' => $row['subject_id'], 'comment' => is_string($row['comment'] ?? null) ? $row['comment'] : null];
                }
            }
            $input['subjects'] = $subjects;
        }

        return $input;
    }

    public function termId(): string
    {
        return $this->string('term_id')->toString();
    }

    public function studentId(): string
    {
        return $this->string('student_id')->toString();
    }
}
