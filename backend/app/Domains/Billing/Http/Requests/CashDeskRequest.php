<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Support\BillingScope;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

/**
 * Caisse d'un jour (`date` AAAA-MM-JJ, aujourd'hui par défaut) : qui encaisse (billing.manage, au titre du
 * personnel). Sa propre caisse ; toutes les caisses avec billing.manage sur toute l'école.
 */
final class CashDeskRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && app(BillingScope::class)->cycles($user, 'billing.manage') !== [];
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return ['date' => ['nullable', 'date_format:Y-m-d']];
    }

    public function day(): ?Carbon
    {
        return $this->filled('date') ? Carbon::createFromFormat('Y-m-d', $this->string('date')->toString()) : null;
    }
}
