<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Requests;

use App\Domains\Identity\Models\User;
use App\Domains\Students\Support\StudentAccess;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;

/**
 * Écriture sur un dossier (suppression, tuteurs…) : 404 hors du périmètre de consultation de l'utilisateur,
 * 403 s'il le voit sans pouvoir le gérer (students.manage sur son cycle).
 */
class ManageStudentRequest extends FormRequest
{
    use StudentRequest;

    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user instanceof User) {
            return false;
        }

        $this->assertVisible($user);

        return $user->can('update', $this->student());
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [];
    }

    protected function assertVisible(User $user): void
    {
        $schoolId = app(TenantContext::class)->schoolId();

        if ($schoolId === null || ! app(StudentAccess::class)->allows($user, $this->student(), $schoolId)) {
            throw new HttpResponseException(new JsonResponse(['message' => 'Not Found'], 404));
        }
    }
}
