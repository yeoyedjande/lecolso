<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Models;

use App\Domains\Attendance\Models\PlannedAbsence;
use App\Domains\Messaging\Enums\MessageSide;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Message d'un fil : immuable (ni modifié ni effacé par la connexion applicative), auteur recopié, texte jamais
 * journalisé (ni journal d'audit, ni logs). Peut accompagner une absence annoncée.
 *
 * @property string $id
 * @property string $school_id
 * @property string $conversation_id
 * @property MessageSide $side
 * @property string $author_id
 * @property string $author_name
 * @property string $body
 * @property string|null $planned_absence_id
 * @property Carbon $sent_at
 * @property-read Conversation $conversation
 * @property-read PlannedAbsence|null $plannedAbsence
 */
final class Message extends Model
{
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['conversation_id', 'side', 'author_id', 'author_name', 'body', 'planned_absence_id', 'sent_at'];

    /**
     * @return BelongsTo<Conversation, $this>
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * @return BelongsTo<PlannedAbsence, $this>
     */
    public function plannedAbsence(): BelongsTo
    {
        return $this->belongsTo(PlannedAbsence::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'side' => MessageSide::class,
            'sent_at' => 'datetime',
        ];
    }
}
