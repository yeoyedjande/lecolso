<?php

declare(strict_types=1);

namespace App\Domains\Students\Models;

use App\Domains\Students\Enums\GuardianRelation;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Lien tuteur × élève (table guardian_student) : parenté, contact principal et payeur (un de chaque par élève),
 * autorisé à récupérer l'enfant.
 *
 * @property string $id
 * @property string $school_id
 * @property string $guardian_id
 * @property string $student_id
 * @property GuardianRelation $relation
 * @property bool $is_primary_contact
 * @property bool $is_payer
 * @property bool $can_pick_up
 * @property-read Guardian $guardian
 * @property-read Student $student
 */
final class GuardianLink extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    protected $table = 'guardian_student';

    /** @var list<string> */
    protected $fillable = ['guardian_id', 'student_id', 'relation', 'is_primary_contact', 'is_payer', 'can_pick_up'];

    /**
     * @return BelongsTo<Guardian, $this>
     */
    public function guardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class);
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'relation' => GuardianRelation::class,
            'is_primary_contact' => 'boolean',
            'is_payer' => 'boolean',
            'can_pick_up' => 'boolean',
        ];
    }
}
