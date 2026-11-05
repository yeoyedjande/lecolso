<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Enums\DeparturePolicy;
use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Politique financière de l'école (direction de toute l'école : school.settings.manage sans cycle).
 * `departure` : cancel_unstarted (défaut) ou keep_all.
 */
final class SaveFinancialPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $schoolId = app(TenantContext::class)->schoolId();

        return $user instanceof User && $schoolId !== null
            && app(Authorizer::class)->allows($user, 'school.settings.manage', $schoolId);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return ['departure' => ['required', Rule::enum(DeparturePolicy::class)]];
    }

    public function departure(): DeparturePolicy
    {
        return DeparturePolicy::from($this->string('departure')->toString());
    }
}
