<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Models;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Messaging\Enums\ConversationChannel;
use App\Domains\Students\Models\Guardian;
use App\Domains\Students\Models\Student;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Fil de messages entre un tuteur et l'école à propos d'un enfant : un par enfant, par tuteur et par destinataire
 * (titulaire ou administration). La classe et le cycle sont ceux de l'enfant à l'ouverture du fil.
 *
 * @property string $id
 * @property string $school_id
 * @property string $student_id
 * @property string $guardian_id
 * @property ConversationChannel $channel
 * @property string $classroom_id
 * @property string $cycle_id
 * @property string $subject
 * @property Carbon $last_message_at
 * @property Carbon $created_at
 * @property-read Student $student
 * @property-read Guardian $guardian
 * @property-read Classroom $classroom
 */
final class Conversation extends Model
{
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['student_id', 'guardian_id', 'channel', 'classroom_id', 'cycle_id', 'subject', 'last_message_at'];

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return BelongsTo<Guardian, $this>
     */
    public function guardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class);
    }

    /**
     * @return BelongsTo<Classroom, $this>
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /**
     * @return HasMany<Message, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'channel' => ConversationChannel::class,
            'last_message_at' => 'datetime',
        ];
    }
}
