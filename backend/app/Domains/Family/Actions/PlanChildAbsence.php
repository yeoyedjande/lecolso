<?php

declare(strict_types=1);

namespace App\Domains\Family\Actions;

use App\Domains\Attendance\Actions\PlanAbsence;
use App\Domains\Attendance\Models\PlannedAbsence;
use App\Domains\Family\Support\GuardianChildren;
use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Actions\StartConversation;
use App\Domains\Messaging\Enums\ConversationChannel;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Le parent prévient d'une absence à venir (décision du 06/11/2026) : absence annoncée (domaine Attendance) et message
 * à l'administration dans le fil de l'enfant (domaine Messaging), dans une même transaction.
 */
final readonly class PlanChildAbsence
{
    public function __construct(
        private GuardianChildren $children,
        private PlanAbsence $plan,
        private StartConversation $start,
    ) {}

    public function handle(User $user, string $studentId, string $startsOn, string $endsOn, string $reason, ?string $message, Carbon $now): PlannedAbsence
    {
        $student = $this->children->query($user)->whereKey($studentId)->first() ?? throw new NotFoundHttpException;

        return DB::transaction(function () use ($user, $student, $startsOn, $endsOn, $reason, $message, $now): PlannedAbsence {
            $planned = $this->plan->handle($user, $student, $startsOn, $endsOn, $reason, $now);
            $period = $startsOn === $endsOn
                ? 'le '.Carbon::parse($startsOn)->format('d/m/Y')
                : 'du '.Carbon::parse($startsOn)->format('d/m/Y').' au '.Carbon::parse($endsOn)->format('d/m/Y');
            $body = "Absence de {$student->first_name} prévue {$period}. Motif : {$reason}";
            if ($message !== null && $message !== '') {
                $body .= "\n\n".$message;
            }
            $this->start->handle($user, $student, ConversationChannel::Office, 'Absences de '.$student->first_name, $body, null, $now, $planned->id);

            return $planned;
        });
    }
}
