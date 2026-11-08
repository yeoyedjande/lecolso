<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Models\CashSession;
use App\Domains\Identity\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use LogicException;

/**
 * Clôture d'une caisse par son caissier (personne d'autre) : espèces comptées (FCFA), note obligatoire en cas d'écart
 * (contrôlée par l'Action, qui connaît le montant attendu).
 */
final class CloseCashSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $this->cashSession()->cashier_id === $user->id;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'counted_cash' => ['required', 'integer', 'min:0', 'max:10000000000'],
            'note' => ['nullable', 'string', 'max:200'],
        ];
    }

    public function cashSession(): CashSession
    {
        $session = $this->route('cashSession');

        return $session instanceof CashSession ? $session : throw new LogicException('Caisse de la route introuvable.');
    }

    public function note(): ?string
    {
        $note = trim($this->string('note')->toString());

        return $note === '' ? null : $note;
    }
}
