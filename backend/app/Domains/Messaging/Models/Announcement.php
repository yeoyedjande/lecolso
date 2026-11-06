<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Models;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Messaging\Enums\AnnouncementAudience;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Annonce de l'école : toute l'école, un cycle ou une classe (`cycle_id` est aussi renseigné pour une classe).
 * Auteur recopié ; `reach` : nombre d'élèves concernés à la publication.
 *
 * @property string $id
 * @property string $school_id
 * @property string $title
 * @property string $body
 * @property AnnouncementAudience $audience
 * @property string|null $cycle_id
 * @property string|null $classroom_id
 * @property int $reach
 * @property string $author_id
 * @property string $author_name
 * @property Carbon $published_at
 * @property-read Cycle|null $cycle
 * @property-read Classroom|null $classroom
 */
final class Announcement extends Model
{
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['title', 'body', 'audience', 'cycle_id', 'classroom_id', 'reach', 'author_id', 'author_name', 'published_at'];

    /**
     * @return BelongsTo<Cycle, $this>
     */
    public function cycle(): BelongsTo
    {
        return $this->belongsTo(Cycle::class);
    }

    /**
     * @return BelongsTo<Classroom, $this>
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'audience' => AnnouncementAudience::class,
            'reach' => 'integer',
            'published_at' => 'datetime',
        ];
    }
}
