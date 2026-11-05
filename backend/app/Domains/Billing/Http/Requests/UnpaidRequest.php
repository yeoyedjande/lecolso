<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Support\BillingScope;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Impayés : le personnel qui voit la facturation (billing.view, hors parents et enseignants), dans ses cycles.
 * Filtres : `cycle_id`, `classroom_id`.
 */
final class UnpaidRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && app(BillingScope::class)->cycles($user, 'billing.view') !== [];
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'cycle_id' => ['nullable', 'uuid'],
            'classroom_id' => ['nullable', 'uuid'],
        ];
    }

    public function cycleId(): ?string
    {
        return $this->filled('cycle_id') ? $this->string('cycle_id')->toString() : null;
    }

    public function classroomId(): ?string
    {
        return $this->filled('classroom_id') ? $this->string('classroom_id')->toString() : null;
    }
}
