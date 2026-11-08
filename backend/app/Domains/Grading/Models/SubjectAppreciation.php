<?php

declare(strict_types=1);

namespace App\Domains\Grading\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Appréciation du titulaire pour un élève dans une matière, pour une période.
 *
 * @property string $id
 * @property string $school_id
 * @property string $term_id
 * @property string $student_id
 * @property string $subject_id
 * @property string $comment
 * @property string $updated_by
 */
final class SubjectAppreciation extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['term_id', 'student_id', 'subject_id', 'comment', 'updated_by'];
}
