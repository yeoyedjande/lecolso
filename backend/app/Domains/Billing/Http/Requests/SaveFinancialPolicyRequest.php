<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Requests;

use App\Domains\Billing\Data\MobileMoneyFees;
use App\Domains\Billing\Enums\DeparturePolicy;
use App\Domains\Billing\Enums\FeePayer;
use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Politique financière de l'école (direction de toute l'école : school.settings.manage sans cycle).
 * `departure` : cancel_unstarted (défaut) ou keep_all ; `mobile_money` : `fee_payer` (school, guardian) et `fee_rate_bps`
 * (0 à 1000 : 150 = 1,5 %). Chaque partie est facultative.
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
        return [
            'departure' => ['sometimes', 'required', Rule::enum(DeparturePolicy::class)],
            'mobile_money' => ['sometimes', 'required', 'array:fee_payer,fee_rate_bps'],
            'mobile_money.fee_payer' => ['required_with:mobile_money', Rule::enum(FeePayer::class)],
            'mobile_money.fee_rate_bps' => ['required_with:mobile_money', 'integer', 'min:0', 'max:'.MobileMoneyFees::MAX_RATE_BPS],
        ];
    }

    public function departure(): ?DeparturePolicy
    {
        return $this->filled('departure') ? DeparturePolicy::from($this->string('departure')->toString()) : null;
    }

    public function mobileMoney(): ?MobileMoneyFees
    {
        if (! $this->has('mobile_money')) {
            return null;
        }

        return new MobileMoneyFees(
            FeePayer::from($this->string('mobile_money.fee_payer')->toString()),
            $this->integer('mobile_money.fee_rate_bps'),
        );
    }
}
