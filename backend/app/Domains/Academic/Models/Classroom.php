<?php

declare(strict_types=1);

namespace App\Domains\Academic\Models;

use App\Domains\Identity\Models\User;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Database\Factories\ClassroomFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Classe : niveau + année + section (« CE1 A »), capacité, salle, enseignant titulaire.
 * Son cycle est celui de son niveau : il porte les droits (school.settings.manage sur ce cycle).
 *
 * @property string $id
 * @property string $school_id
 * @property string $academic_year_id
 * @property string $level_id
 * @property string $section
 * @property int|null $capacity
 * @property string|null $room
 * @property string|null $homeroom_teacher_id
 * @property-read Level $level
 * @property-read AcademicYear $academicYear
 * @property-read User|null $homeroomTeacher
 */
final class Classroom extends Model
{
    use Auditable;
    use BelongsToSchool;

    /** @use HasFactory<ClassroomFactory> */
    use HasFactory;

    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['academic_year_id', 'level_id', 'section', 'capacity', 'room', 'homeroom_teacher_id'];

    /** Nom affiché : code du niveau et section (« CE1 A »). */
    public function name(): string
    {
        return trim($this->level->code.' '.$this->section);
    }

    /**
     * @return BelongsTo<Level, $this>
     */
    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    /**
     * @return BelongsTo<AcademicYear, $this>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function homeroomTeacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'homeroom_teacher_id');
    }

    protected static function newFactory(): ClassroomFactory
    {
        return ClassroomFactory::new();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['capacity' => 'integer'];
    }
}
