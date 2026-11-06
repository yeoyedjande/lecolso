<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Requests;

use App\Domains\Attendance\Enums\JustificationSource;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Support\AttendanceAccess;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\StudentAccess;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use LogicException;

/**
 * Justifier une absence ou un retard : le parent de l'enfant (attendance.justify, à valider) ou le personnel qui décide
 * (attendance.manage sur le cycle, acceptée directement). `reason` (3 à 300 caractères), `proof` (photo JPEG, PNG ou
 * WebP, 5 Mo au plus, facultative). Absence que l'utilisateur ne voit pas : 404.
 */
final class JustifyAbsenceRequest extends FormRequest
{
    private ?JustificationSource $source = null;

    public function authorize(): bool
    {
        $user = $this->user();
        $schoolId = app(TenantContext::class)->schoolId();
        $mark = $this->mark()->loadMissing('rollCall.classroom.level.cycle');
        $access = app(AttendanceAccess::class);
        if (! $user instanceof User || $schoolId === null || Student::query()->find($mark->student_id) === null) {
            throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
        }

        if ($access->canDecide($user, $mark->rollCall->classroom)) {
            $this->source = JustificationSource::School;

            return true;
        }
        if (app(StudentAccess::class)->allows($user, $mark->student, $schoolId, 'attendance.justify')) {
            $this->source = JustificationSource::Guardian;

            return true;
        }
        if ($access->canView($user, $mark->rollCall->classroom)) {
            return false;
        }

        throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:3', 'max:300'],
            'proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }

    public function mark(): AttendanceMark
    {
        $mark = $this->route('mark');

        return $mark instanceof AttendanceMark ? $mark : throw new LogicException('Absence de la route introuvable.');
    }

    public function source(): JustificationSource
    {
        return $this->source ?? throw new LogicException('Demande non autorisée.');
    }
}
