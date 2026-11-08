<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Actions\SendPaymentReminders;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Billing\Support\BillingScope;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

/**
 * Relance SMS des payeurs de factures en retard (billing.manage sur le cycle de chaque facture). `invoice_ids` : 1 à
 * 1 000 factures (toute une école en une demande, pour garder un SMS par payeur) ; une facture inconnue ou hors du
 * périmètre est refusée comme inexistante (422), une facture vue mais non relançable donne 403.
 */
final class RemindRequest extends FormRequest
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
        return [
            'invoice_ids' => ['required', 'array', 'min:1', 'max:'.SendPaymentReminders::MAX_INVOICES],
            'invoice_ids.*' => ['required', 'uuid', 'distinct'],
        ];
    }

    /**
     * @return Collection<int, Invoice>
     *
     * @throws ValidationException facture inconnue ou hors du périmètre
     * @throws AuthorizationException facture que l'utilisateur ne peut pas relancer
     */
    public function invoices(): Collection
    {
        $user = $this->user();
        $ids = array_values(array_filter((array) $this->input('invoice_ids'), 'is_string'));
        // Sous la RLS de l'école courante ; élèves supprimés exclus
        $invoices = Invoice::query()->whereKey($ids)->whereHas('student')->get();

        $visible = $invoices->filter(static fn (Invoice $invoice): bool => $user instanceof User && $user->can('view', $invoice));
        if (! $user instanceof User || $visible->count() !== count($ids)) {
            throw ValidationException::withMessages(['invoice_ids' => 'Facture introuvable.']);
        }
        if ($visible->contains(static fn (Invoice $invoice): bool => ! $user->can('remind', $invoice))) {
            throw new AuthorizationException;
        }

        return $visible->values();
    }
}
