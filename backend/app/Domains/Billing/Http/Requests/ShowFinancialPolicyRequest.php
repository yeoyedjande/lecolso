<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Support\BillingScope;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/** Politique financière de l'école : le personnel qui voit la facturation (billing.view, hors parents). */
final class ShowFinancialPolicyRequest extends FormRequest
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
        return [];
    }
}
