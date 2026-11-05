<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use LogicException;

/**
 * Inscription d'un élève : `classroom_id` (changement de classe, même année) ou `status` (`left` avec `left_on` et
 * `leave_reason` facultatif ; `active` pour un retour). Droits : gérer l'élève, et inscrire dans la nouvelle classe.
 */
final class UpdateEnrollmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user instanceof User) {
            return false;
        }

        $student = Student::query()->find($this->enrollment()->student_id);
        if ($student === null || ! $user->can('view', $student)) {
            throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
        }

        $target = $this->targetClassroom();

        return $user->can('update', $student) && ($target === null || $user->can('enrollIn', [Student::class, $target]));
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'classroom_id' => ['sometimes', 'uuid', 'exists:classrooms,id'],
            'status' => ['sometimes', 'in:active,left'],
            'left_on' => ['required_if:status,left', 'date_format:Y-m-d'],
            'leave_reason' => ['sometimes', 'nullable', 'string', 'max:200'],
        ];
    }

    public function enrollment(): Enrollment
    {
        $enrollment = $this->route('enrollment');

        return $enrollment instanceof Enrollment ? $enrollment : throw new LogicException('Inscription de la route introuvable.');
    }

    public function targetClassroom(): ?Classroom
    {
        $id = $this->input('classroom_id');

        return is_string($id) && Str::isUuid($id) ? Classroom::query()->with(['level', 'academicYear'])->find($id) : null;
    }
}
