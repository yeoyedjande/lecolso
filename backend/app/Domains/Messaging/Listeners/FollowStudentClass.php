<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Listeners;

use App\Domains\Messaging\Models\Conversation;
use App\Domains\Students\Events\StudentChangedClass;
use App\Domains\Students\Models\Enrollment;

/**
 * Un élève change de classe dans l'année en cours : ses fils suivent sa nouvelle classe (titulaire et cycle), pour que
 * l'ancien titulaire ou l'ancien cycle n'y ait plus accès et que les nouveaux y aient accès. Écouteur synchrone, dans
 * la transaction du changement.
 */
final class FollowStudentClass
{
    public function handle(StudentChangedClass $event): void
    {
        $enrollment = Enrollment::query()->whereKey($event->enrollmentId)->with(['classroom.level', 'academicYear'])->first();
        if ($enrollment === null || ! $enrollment->academicYear->is_current) {
            return;
        }

        Conversation::query()->where('student_id', $event->studentId)->get()
            ->each(static fn (Conversation $conversation): bool => $conversation->forceFill([
                'classroom_id' => $enrollment->classroom_id,
                'cycle_id' => $enrollment->classroom->level->cycle_id,
            ])->save());
    }
}
