<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Identity\Models\User;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\StudentAccess;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use LogicException;

/** Factures d'un élève : billing.view dans son périmètre (sinon 404, rien à deviner). */
final class StudentInvoicesRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $schoolId = app(TenantContext::class)->schoolId();

        if (! $user instanceof User || $schoolId === null || ! app(StudentAccess::class)->allows($user, $this->student(), $schoolId, 'billing.view')) {
            throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
        }

        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }

    public function student(): Student
    {
        $student = $this->route('student');

        return $student instanceof Student ? $student : throw new LogicException('Élève de la route introuvable.');
    }
}
