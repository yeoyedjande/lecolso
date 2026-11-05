<?php

declare(strict_types=1);

namespace App\Domains\Students\Actions;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Data\StudentFilters;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\StudentAccess;
use App\Domains\Tenancy\Models\School;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Élèves inscrits sur une année (l'année en cours par défaut), par nom puis prénom, 25 par page (curseur), limités
 * à ce que l'utilisateur peut voir (StudentAccess). Chaque élève porte son inscription de cette année.
 */
final readonly class ListStudents
{
    public const int PER_PAGE = 25;

    public function __construct(private StudentAccess $access) {}

    /**
     * @return CursorPaginator<int, Student>
     */
    public function handle(User $user, School $school, StudentFilters $filters): CursorPaginator
    {
        $yearId = $filters->academicYearId ?? AcademicYear::query()->where('is_current', true)->value('id');
        $yearId = is_string($yearId) ? $yearId : null;

        $inYear = static fn (Builder|HasMany $enrollment) => $enrollment
            ->where('academic_year_id', $yearId)
            ->when($filters->classroomId !== null, static fn ($query) => $query->where('classroom_id', $filters->classroomId))
            ->when($filters->status !== null, static fn ($query) => $query->where('status', $filters->status))
            ->when($filters->cycleId !== null, static fn ($query) => $query->whereHas(
                'classroom.level',
                static fn (Builder $level) => $level->where('cycle_id', $filters->cycleId),
            ));

        $query = $this->access->constrain(Student::query(), $user, $school)
            ->whereHas('enrollments', $inYear)
            ->with([
                'enrollments' => static fn (HasMany $enrollment) => $enrollment->where('academic_year_id', $yearId)
                    ->with('classroom.level.cycle'),
                'guardianLinks.guardian',
            ]);

        if ($filters->search !== null && $filters->search !== '') {
            $like = '%'.addcslashes(mb_strtolower($filters->search), '%_\\').'%';
            $digits = preg_replace('/\D+/', '', $filters->search) ?? '';
            $query->where(static function (Builder $where) use ($like, $digits): void {
                $where->whereRaw("lower(first_name || ' ' || last_name) like ?", [$like])
                    ->orWhereRaw("lower(last_name || ' ' || first_name) like ?", [$like])
                    ->orWhereRaw('lower(matricule) like ?', [$like])
                    ->orWhereHas('guardianLinks.guardian', static function (Builder $guardian) use ($like, $digits): void {
                        $guardian->whereRaw('lower(name) like ?', [$like]);
                        if (strlen($digits) >= 4) {
                            $guardian->orWhere('phone', 'like', '%'.$digits.'%');
                        }
                    });
            });
        }

        return $query->orderBy('last_name')->orderBy('first_name')->orderBy('id')->cursorPaginate(self::PER_PAGE);
    }
}
