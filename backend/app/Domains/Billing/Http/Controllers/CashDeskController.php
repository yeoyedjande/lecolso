<?php

declare(strict_types=1);

namespace App\Domains\Billing\Http\Controllers;

use App\Domains\Billing\Actions\CloseCashSession;
use App\Domains\Billing\Actions\SaveFinancialPolicy;
use App\Domains\Billing\Actions\ShowCashDesk;
use App\Domains\Billing\Http\Requests\CashDeskRequest;
use App\Domains\Billing\Http\Requests\CloseCashSessionRequest;
use App\Domains\Billing\Http\Requests\SaveFinancialPolicyRequest;
use App\Domains\Billing\Http\Requests\ShowFinancialPolicyRequest;
use App\Domains\Billing\Http\Resources\CashDeskResource;
use App\Domains\Billing\Http\Resources\CashSessionResource;
use App\Domains\Billing\Http\Resources\FinancialPolicyResource;
use App\Domains\Billing\Support\FinancialPolicy;
use App\Domains\Identity\Models\User;
use App\Support\Tenancy\TenantContext;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use LogicException;

/** Caisse du jour, clôture d'une caisse, politique financière de l'école. */
final class CashDeskController
{
    /**
     * Caisse d'un jour.
     *
     * `date` (AAAA-MM-JJ, aujourd'hui par défaut). Sa caisse ; toutes avec `billing.manage` sur toute l'école.
     */
    public function show(CashDeskRequest $request, ShowCashDesk $desk): CashDeskResource
    {
        return new CashDeskResource($desk->handle($this->user($request), $request->day()));
    }

    /**
     * Clôturer sa caisse.
     *
     * Espèces comptées (`counted_cash`) ; `note` obligatoire en cas d'écart. Ensuite la caisse est figée.
     * 409 `cash_closed`.
     */
    public function close(CloseCashSessionRequest $request, CloseCashSession $close): CashSessionResource
    {
        $user = $this->user($request);
        $session = $close->handle($user, $request->cashSession(), $request->integer('counted_cash'), $request->note(), Carbon::now());

        return new CashSessionResource(['session' => $session, 'mine' => true]);
    }

    /** Politique financière de l'école. */
    public function policy(ShowFinancialPolicyRequest $request, TenantContext $context): FinancialPolicyResource
    {
        return new FinancialPolicyResource(FinancialPolicy::departure($context->school()));
    }

    /**
     * Modifier la politique financière.
     *
     * Direction de toute l'école (`school.settings.manage`). S'applique aux départs enregistrés ensuite.
     */
    public function savePolicy(SaveFinancialPolicyRequest $request, SaveFinancialPolicy $save, TenantContext $context): FinancialPolicyResource
    {
        $school = $context->school() ?? throw new LogicException('Aucune école courante.');

        return new FinancialPolicyResource($save->handle($school, $request->departure()));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
