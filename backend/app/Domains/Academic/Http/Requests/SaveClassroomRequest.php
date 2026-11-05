<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Requests;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Academic\Models\Level;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

/**
 * Création (POST : niveau et section obligatoires ; année en cours par défaut) ou modification (PATCH).
 * Droits : school.settings.manage sur le cycle du niveau, et sur celui du nouveau niveau en cas de changement.
 */
final class SaveClassroomRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user instanceof User) {
            return false;
        }

        $classroom = $this->classroom();

        if ($classroom !== null && ! $user->can('update', $classroom)) {
            return false;
        }

        $level = $this->targetLevel();

        // Niveau inconnu ou d'une autre école : la validation l'explique (422)
        return $level === null ? ($classroom !== null || $this->isMethod('POST')) : $user->can('create', [Classroom::class, $level]);
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'level_id' => [$required, 'uuid', 'exists:levels,id'],
            'academic_year_id' => ['sometimes', 'uuid'],
            'section' => [$required, 'string', 'min:1', 'max:10'],
            'capacity' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:200'],
            'room' => ['sometimes', 'nullable', 'string', 'max:40'],
            'homeroom_teacher_id' => ['sometimes', 'nullable', 'uuid'],
        ];
    }

    public function classroom(): ?Classroom
    {
        $classroom = $this->route('classroom');

        return $classroom instanceof Classroom ? $classroom : null;
    }

    /**
     * @return array{academic_year_id?: string, level_id?: string, section?: string, capacity?: int|null, room?: string|null, homeroom_teacher_id?: string|null}
     */
    public function classroomAttributes(): array
    {
        $attributes = [];

        if ($this->has('level_id')) {
            $attributes['level_id'] = $this->string('level_id')->toString();
        }

        if ($this->has('section')) {
            $attributes['section'] = Str::upper(trim($this->string('section')->toString()));
        }

        if ($this->has('academic_year_id')) {
            $attributes['academic_year_id'] = $this->string('academic_year_id')->toString();
        } elseif ($this->classroom() === null) {
            $current = AcademicYear::query()->where('is_current', true)->value('id');
            $attributes['academic_year_id'] = is_string($current) ? $current : '';
        }

        if ($this->exists('capacity')) {
            $attributes['capacity'] = $this->input('capacity') === null ? null : $this->integer('capacity');
        }

        foreach (['room', 'homeroom_teacher_id'] as $field) {
            if ($this->exists($field)) {
                $value = trim($this->string($field)->toString());
                $attributes[$field] = $value === '' ? null : $value;
            }
        }

        return $attributes;
    }

    /** Niveau visé : celui envoyé (sous la RLS de l'école courante), sinon celui de la classe. */
    private function targetLevel(): ?Level
    {
        $levelId = $this->input('level_id');

        if (is_string($levelId) && Str::isUuid($levelId)) {
            return Level::query()->find($levelId);
        }

        return $this->classroom()?->level;
    }
}
