<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Actions;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Enums\AnnouncementAudience;
use App\Domains\Messaging\Models\Announcement;
use App\Domains\Messaging\Support\AnnouncementAccess;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Models\Enrollment;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Publie une annonce pour toute l'école, un cycle ou une classe, dans l'appli (le SMS viendra avec le fournisseur, lot
 * 10). `reach` : élèves inscrits concernés à la publication.
 */
final readonly class PublishAnnouncement
{
    public function __construct(private AnnouncementAccess $access) {}

    /**
     * @throws AuthorizationException
     */
    public function handle(User $author, string $title, string $body, AnnouncementAudience $audience, ?string $cycleId, ?Classroom $classroom, Carbon $now): Announcement
    {
        $classroom?->loadMissing('level');
        $cycleId = $classroom?->level->cycle_id ?? $cycleId;
        if (! $this->access->canPublish($author, $audience, $cycleId, $classroom)) {
            throw new AuthorizationException;
        }

        return Announcement::query()->create([
            'title' => $title,
            'body' => $body,
            'audience' => $audience,
            'cycle_id' => $audience === AnnouncementAudience::School ? null : $cycleId,
            'classroom_id' => $audience === AnnouncementAudience::Classroom ? $classroom?->id : null,
            'reach' => self::reach($audience, $cycleId, $classroom),
            'author_id' => $author->id,
            'author_name' => $author->name,
            'published_at' => $now,
        ]);
    }

    private static function reach(AnnouncementAudience $audience, ?string $cycleId, ?Classroom $classroom): int
    {
        $year = AcademicYear::query()->where('is_current', true)->first();
        if ($year === null) {
            return 0;
        }

        return Enrollment::query()
            ->where('academic_year_id', $year->id)
            ->where('status', EnrollmentStatus::Active)
            ->whereHas('student')
            ->when($audience === AnnouncementAudience::Classroom, static fn (Builder $q) => $q->where('classroom_id', $classroom?->id))
            ->when($audience === AnnouncementAudience::Cycle, static fn (Builder $q) => $q->whereHas('classroom.level', static fn (Builder $level) => $level->where('cycle_id', $cycleId)))
            ->distinct()
            ->count('student_id');
    }
}
