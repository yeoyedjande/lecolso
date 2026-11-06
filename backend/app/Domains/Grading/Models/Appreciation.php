<?php

declare(strict_types=1);

namespace App\Domains\Grading\Models;

use App\Domains\Grading\Enums\Mention;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Appréciations d'un élève pour une période : générale (titulaire), observation et mention (direction). Mention non
 * choisie (`mention_chosen` faux) : proposée d'après la moyenne, figée à la validation.
 *
 * @property string $id
 * @property string $school_id
 * @property string $term_id
 * @property string $student_id
 * @property string|null $teacher_comment
 * @property string|null $director_comment
 * @property Mention|null $mention
 * @property bool $mention_chosen
 * @property string $updated_by
 */
final class Appreciation extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['term_id', 'student_id', 'teacher_comment', 'director_comment', 'mention', 'mention_chosen', 'updated_by'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['mention' => Mention::class, 'mention_chosen' => 'boolean'];
    }
}
