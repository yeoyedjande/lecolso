<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Actions;

use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Enums\ConversationChannel;
use App\Domains\Messaging\Models\Conversation;
use App\Domains\Messaging\Support\ConversationAccess;
use App\Domains\Students\Models\GuardianLink;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\CurrentClassroom;
use App\Support\Http\BusinessConflict;
use App\Support\Time\SchoolClock;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Écrit à propos d'un enfant : le parent au titulaire ou à l'administration, ou l'école à un tuteur de l'enfant.
 * Un fil existe déjà pour cet enfant, ce tuteur et ce destinataire : le message s'y ajoute.
 */
final readonly class StartConversation
{
    public function __construct(
        private ConversationAccess $access,
        private PostMessage $post,
    ) {}

    /**
     * @param  string|null  $guardianId  tuteur visé (côté école) ; ignoré pour un parent, qui écrit en son nom
     *
     * @throws AuthorizationException
     * @throws BusinessConflict not_enrolled, no_teacher
     */
    public function handle(User $author, Student $student, ConversationChannel $channel, string $subject, string $body, ?string $guardianId, Carbon $now, ?string $plannedAbsenceId = null): Conversation
    {
        $mine = $this->access->guardianIds($author);
        $links = GuardianLink::query()->where('student_id', $student->id)->get()
            ->map(static fn (GuardianLink $link): string => $link->guardian_id)->values()->all();
        $asGuardian = array_values(array_intersect($mine, $links));
        $guardian = $asGuardian[0] ?? $guardianId;
        if ($guardian === null || ! in_array($guardian, $links, true)) {
            // Pas son enfant, ou tuteur qui n'est pas celui de l'enfant : rien à deviner
            throw new NotFoundHttpException;
        }

        $classroom = CurrentClassroom::of($student->id, SchoolClock::date($now))
            ?? throw new BusinessConflict('not_enrolled', 'Cet élève n’est inscrit dans aucune classe cette année.');
        if ($channel === ConversationChannel::Teacher && $classroom->homeroom_teacher_id === null) {
            throw new BusinessConflict('no_teacher', 'Cette classe n’a pas encore d’enseignant(e) titulaire : écrivez à l’administration.');
        }

        return DB::transaction(function () use ($author, $student, $channel, $subject, $body, $guardian, $classroom, $now, $plannedAbsenceId, $asGuardian): Conversation {
            $conversation = Conversation::query()->createOrFirst(
                ['student_id' => $student->id, 'guardian_id' => $guardian, 'channel' => $channel],
                ['classroom_id' => $classroom->id, 'cycle_id' => $classroom->level->cycle_id, 'subject' => $subject, 'last_message_at' => $now],
            );
            // L'enfant a changé de classe depuis l'ouverture : le fil suit sa classe (et son titulaire) actuelle
            if ($conversation->classroom_id !== $classroom->id) {
                $conversation->forceFill(['classroom_id' => $classroom->id, 'cycle_id' => $classroom->level->cycle_id])->save();
                $conversation->unsetRelation('classroom');
            }
            if ($asGuardian === [] && ! $this->access->canWrite($author, $conversation)) {
                throw new AuthorizationException;
            }
            $this->post->handle($author, $conversation, $body, $now, $plannedAbsenceId);

            return $conversation->refresh();
        });
    }
}
