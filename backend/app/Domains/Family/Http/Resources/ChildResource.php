<?php

declare(strict_types=1);

namespace App\Domains\Family\Http\Resources;

use App\Domains\Family\Data\ChildView;
use App\Domains\Grading\Http\Resources\TermResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Fiche d'un enfant dans l'espace parent. Notes au fil de l'eau : évaluations et moyenne de chaque matière ; la moyenne
 * générale, le rang et la mention ne figurent que sur les bulletins validés (`report_cards`).
 *
 * @property-read ChildView $resource
 */
final class ChildResource extends JsonResource
{
    /**
     * @return array{student: ChildStudentResource, assessment_mode: string, grade_scale: int, terms: AnonymousResourceCollection, term: TermResource|null, subjects: AnonymousResourceCollection, skills: AnonymousResourceCollection, report_cards: AnonymousResourceCollection, absences: AnonymousResourceCollection, balance: ChildBalanceResource|null, payments: AnonymousResourceCollection, planned_absences: AnonymousResourceCollection, mobile_money: array{available: bool, fee_payer: string, fee_rate_bps: int}}
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;

        return [
            'student' => new ChildStudentResource(['student' => $view->student, 'enrollment' => $view->enrollment]),
            'assessment_mode' => $view->assessmentMode,
            'grade_scale' => $view->gradeScale,
            'terms' => TermResource::collection($view->terms),
            'term' => $view->term === null ? null : new TermResource($view->term),
            'subjects' => ChildSubjectResource::collection($view->subjects),
            'skills' => ChildSkillResource::collection($view->skills),
            'report_cards' => ChildReportCardResource::collection($view->reportCards),
            'absences' => ChildMarkResource::collection($view->marks),
            'balance' => $view->balance === null ? null : new ChildBalanceResource($view->balance),
            'payments' => ChildPaymentResource::collection($view->payments),
            'planned_absences' => ChildPlannedAbsenceResource::collection($view->plannedAbsences),
            // Paiement Mobile Money : disponible si un prestataire est configuré ; frais pour l'affichage avant paiement
            'mobile_money' => [
                'available' => $view->mobileMoneyAvailable === true,
                'fee_payer' => $view->mobileMoneyFees->payer->value,
                'fee_rate_bps' => $view->mobileMoneyFees->rateBps,
            ],
        ];
    }
}
