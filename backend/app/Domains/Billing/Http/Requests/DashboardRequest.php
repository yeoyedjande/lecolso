<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Support\BillingScope;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/** Tableau de bord : le personnel qui voit les élèves ou la facturation (hors parents et enseignants). */
final class DashboardRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        $scope = app(BillingScope::class);

        return $user instanceof User && ($scope->cycles($user, 'students.view') !== [] || $scope->cycles($user, 'billing.view') !== []);
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [];
    }
}
